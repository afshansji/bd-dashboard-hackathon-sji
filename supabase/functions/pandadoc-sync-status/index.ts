import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptSecret } from "../_shared/crypto.ts";
import { sendProposalNotification, checkNotificationPreferences } from "../_shared/notifications.ts";
import { insertAnalyticsMetrics } from "../_shared/analytics.ts";

const PANDADOC_API_BASE = 'https://api.pandadoc.com/public/v1';

interface SyncResult {
  proposal_id: string;
  pandadoc_doc_id: string;
  old_status: string;
  new_status: string;
  updated: boolean;
  error?: string;
}

serve(async (req) => {
  console.log('[pandadoc-sync-status] Starting cron sync...');
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const syncStartTime = new Date();
    const results: SyncResult[] = [];
    let proposalsChecked = 0;
    let proposalsUpdated = 0;
    const errors: Array<{ proposal_id: string; error: string }> = [];

    // Fetch active proposals that need syncing
    const { data: proposals, error: fetchError } = await supabase
      .from('proposal_documents')
      .select(`
        id,
        pandadoc_doc_id,
        status,
        deal_id,
        created_by,
        sent_at,
        viewed_at,
        updated_at,
        deals(id, title, stage, status)
      `)
      .in('status', ['draft', 'sent', 'viewed'])
      .order('updated_at', { ascending: true })
      .limit(50);

    if (fetchError) {
      throw new Error(`Failed to fetch proposals: ${fetchError.message}`);
    }

    if (!proposals || proposals.length === 0) {
      console.log('[pandadoc-sync-status] No active proposals to sync');
      return new Response(
        JSON.stringify({ 
          synced: 0, 
          updated: 0, 
          message: 'No active proposals to sync' 
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`[pandadoc-sync-status] Found ${proposals.length} proposals to check`);

    // Process each proposal
    for (const proposal of proposals) {
      try {
        // Skip if recently updated (within last 5 minutes - probably webhook updated it)
        if (proposal.updated_at) {
          const minutesSinceUpdate = (Date.now() - new Date(proposal.updated_at).getTime()) / (1000 * 60);
          if (minutesSinceUpdate < 5) {
            console.log(`[pandadoc-sync-status] Skipping ${proposal.id} - recently updated`);
            continue;
          }
        }

        // Check for expired proposals (sent > 30 days ago)
        if (proposal.status === 'sent' && proposal.sent_at) {
          const daysSinceSent = (Date.now() - new Date(proposal.sent_at).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceSent > 30) {
            await supabase
              .from('proposal_documents')
              .update({ 
                status: 'expired',
                updated_at: new Date().toISOString() 
              })
              .eq('id', proposal.id);

            results.push({
              proposal_id: proposal.id,
              pandadoc_doc_id: proposal.pandadoc_doc_id,
              old_status: proposal.status,
              new_status: 'expired',
              updated: true,
            });

            proposalsChecked++;
            proposalsUpdated++;
            console.log(`[pandadoc-sync-status] Marked proposal ${proposal.id} as expired`);
            continue;
          }
        }

        // Get user's PandaDoc integration
        const { data: integration, error: integrationError } = await supabase
          .from('pandadoc_integrations')
          .select('api_key_encrypted, user_id')
          .eq('user_id', proposal.created_by)
          .eq('is_active', true)
          .maybeSingle();

        if (integrationError || !integration) {
          errors.push({
            proposal_id: proposal.id,
            error: 'No active integration found for user',
          });
          continue;
        }

        // Decrypt API key
        const apiKey = await decryptSecret(integration.api_key_encrypted);
        if (!apiKey) {
          errors.push({
            proposal_id: proposal.id,
            error: 'Failed to decrypt API key',
          });
          continue;
        }

        // Fetch document status from PandaDoc
        const response = await fetch(`${PANDADOC_API_BASE}/documents/${proposal.pandadoc_doc_id}`, {
          headers: {
            'Authorization': `API-Key ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          errors.push({
            proposal_id: proposal.id,
            error: `PandaDoc API error: ${response.status} - ${errorText}`,
          });
          continue;
        }

        const pandadocDoc = await response.json();
        proposalsChecked++;

        // Map PandaDoc status to our status
        const pandadocStatus = pandadocDoc.status;
        let newStatus = proposal.status;

        if (pandadocStatus === 'document.draft') {
          newStatus = 'draft';
        } else if (pandadocStatus === 'document.sent') {
          newStatus = 'sent';
        } else if (pandadocStatus === 'document.viewed') {
          newStatus = 'viewed';
        } else if (pandadocStatus === 'document.completed') {
          newStatus = 'signed';
        } else if (pandadocStatus === 'document.rejected') {
          newStatus = 'declined';
        } else if (pandadocStatus === 'document.expired') {
          newStatus = 'expired';
        }

        // Check if status changed
        if (newStatus !== proposal.status) {
          const updates: any = {
            status: newStatus,
            updated_at: new Date().toISOString(),
          };

          // Handle specific status updates
          if (newStatus === 'viewed' && !proposal.viewed_at) {
            updates.viewed_at = new Date().toISOString();
          } else if (newStatus === 'signed') {
            updates.completed_at = new Date().toISOString();

            // Update deal to closed_won
            if (proposal.deal_id) {
              await supabase
                .from('deals')
                .update({
                  stage: 'closed_won',
                  status: 'won',
                  close_date: new Date().toISOString().split('T')[0],
                })
                .eq('id', proposal.deal_id);

              console.log(`[pandadoc-sync-status] Updated deal ${proposal.deal_id} to closed_won`);
            }

            // Download PDF
            try {
              const pdfResponse = await fetch(`${PANDADOC_API_BASE}/documents/${proposal.pandadoc_doc_id}/download`, {
                headers: {
                  'Authorization': `API-Key ${apiKey}`,
                },
              });

              if (pdfResponse.ok) {
                const pdfBuffer = await pdfResponse.arrayBuffer();
                const fileName = `proposals/${proposal.pandadoc_doc_id}.pdf`;

                const { error: uploadError } = await supabase.storage
                  .from('deal-files')
                  .upload(fileName, pdfBuffer, {
                    contentType: 'application/pdf',
                    upsert: true,
                  });

                if (!uploadError) {
                  updates.pdf_url = fileName;
                  console.log(`[pandadoc-sync-status] Saved PDF to ${fileName}`);
                }
              }
            } catch (pdfError) {
              console.error('[pandadoc-sync-status] Failed to download PDF:', pdfError);
            }
          }

          // Update proposal
          const oldStatus = proposal.status;
          const { error: updateError } = await supabase
            .from('proposal_documents')
            .update(updates)
            .eq('id', proposal.id);

          if (updateError) {
            errors.push({
              proposal_id: proposal.id,
              error: `Failed to update proposal: ${updateError.message}`,
            });
            continue;
          }

          // Send notification if status changed
          try {
            const { data: fullProposal } = await supabase
              .from('proposal_documents')
              .select(`
                id,
                title,
                deal_id,
                deals!inner(
                  id,
                  title,
                  owner_id,
                  client_id,
                  clients(name)
                )
              `)
              .eq('id', proposal.id)
              .single();

            if (fullProposal && fullProposal.deals) {
              const deal = fullProposal.deals as any;
              const ownerId = deal.owner_id;

              if (ownerId) {
                const { data: owner } = await supabase
                  .from('profiles')
                  .select('email')
                  .eq('id', ownerId)
                  .single();

                if (owner?.email) {
                  let notificationType = '';
                  let shouldSendNotification = false;

                  if (newStatus === 'viewed' && oldStatus === 'sent') {
                    notificationType = 'proposal_viewed';
                    shouldSendNotification = await checkNotificationPreferences(supabase, ownerId, 'proposal_viewed');
                  } else if (newStatus === 'signed') {
                    notificationType = 'proposal_signed';
                    shouldSendNotification = await checkNotificationPreferences(supabase, ownerId, 'proposal_signed');
                  } else if (newStatus === 'declined') {
                    notificationType = 'proposal_declined';
                    shouldSendNotification = await checkNotificationPreferences(supabase, ownerId, 'proposal_declined');
                  }

                  if (shouldSendNotification && notificationType) {
                    await sendProposalNotification(
                      owner.email,
                      notificationType as any,
                      {
                        proposalTitle: fullProposal.title,
                        clientName: deal.clients?.name || 'Client',
                        dealTitle: deal.title,
                        viewedAt: newStatus === 'viewed' ? new Date().toISOString() : undefined,
                        signedAt: newStatus === 'signed' ? new Date().toISOString() : undefined,
                        declinedAt: newStatus === 'declined' ? new Date().toISOString() : undefined,
                      }
                    );
                    console.log(`[sync] Sent ${notificationType} notification to ${owner.email}`);
                  }
                }
              }
            }
          } catch (notificationError) {
            console.error('[sync] Failed to send notification:', notificationError);
            // Don't fail the sync if notification fails
          }

          proposalsUpdated++;

          // Track analytics
          try {
            const metrics: any[] = [
              {
                metric_name: 'proposal_status_changed',
                metric_value: 1,
                source: 'pandadoc',
                dimensions: {
                  proposal_id: proposal.id,
                  deal_id: proposal.deal_id,
                  old_status: proposal.status,
                  new_status: newStatus,
                  trigger: 'cron_sync',
                },
              }
            ];

            if (newStatus === 'signed') {
              const timeToSignHours = proposal.sent_at 
                ? (Date.now() - new Date(proposal.sent_at).getTime()) / (1000 * 60 * 60)
                : null;

              metrics.push({
                metric_name: 'proposal_signed',
                metric_value: 1,
                source: 'pandadoc',
                dimensions: {
                  proposal_id: proposal.id,
                  deal_id: proposal.deal_id,
                  time_to_sign_hours: timeToSignHours || 0,
                },
              });
            }

            await insertAnalyticsMetrics(supabase, metrics, { defaultSource: 'pandadoc' });
          } catch (analyticsError) {
            console.error('[pandadoc-sync-status] Failed to insert analytics:', analyticsError);
          }

          results.push({
            proposal_id: proposal.id,
            pandadoc_doc_id: proposal.pandadoc_doc_id,
            old_status: proposal.status,
            new_status: newStatus,
            updated: true,
          });

          console.log(`[pandadoc-sync-status] Updated proposal ${proposal.id}: ${proposal.status} → ${newStatus}`);
        } else {
          results.push({
            proposal_id: proposal.id,
            pandadoc_doc_id: proposal.pandadoc_doc_id,
            old_status: proposal.status,
            new_status: newStatus,
            updated: false,
          });
        }

        // Rate limiting: wait 200ms between API calls
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({
          proposal_id: proposal.id,
          error: errorMessage,
        });
        console.error(`[pandadoc-sync-status] Error processing proposal ${proposal.id}:`, error);
      }
    }

    const syncDurationMs = Date.now() - syncStartTime.getTime();

    // Log sync run summary
    console.log(`[pandadoc-sync-status] Sync completed:`, {
      proposalsChecked,
      proposalsUpdated,
      errorsCount: errors.length,
      durationMs: syncDurationMs,
    });

    // Track sync run analytics
    try {
      await insertAnalyticsMetrics(supabase, [
        {
          metric_name: 'pandadoc_sync_run',
          metric_value: 1,
          source: 'pandadoc',
          dimensions: {
            proposals_checked: proposalsChecked,
            proposals_updated: proposalsUpdated,
            errors_count: errors.length,
            duration_ms: syncDurationMs,
          },
        }
      ], { defaultSource: 'pandadoc' });
    } catch (analyticsError) {
      console.error('[pandadoc-sync-status] Failed to insert sync run analytics:', analyticsError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced: proposalsChecked,
        updated: proposalsUpdated,
        errors: errors.length > 0 ? errors : undefined,
        duration_ms: syncDurationMs,
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[pandadoc-sync-status] Fatal error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage 
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

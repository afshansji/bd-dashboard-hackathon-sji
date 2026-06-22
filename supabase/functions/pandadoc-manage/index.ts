import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptSecret, decryptSecret } from "../_shared/crypto.ts";
import { sendProposalNotification, checkNotificationPreferences } from "../_shared/notifications.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

const PANDADOC_API_BASE = 'https://api.pandadoc.com/public/v1';

interface PandaDocIntegration {
  id: string;
  user_id: string;
  api_key_encrypted: string;
  workspace_id?: string;
  default_template_id?: string;
  is_active: boolean;
  auto_send_enabled: boolean;
  embed_enabled: boolean;
  config: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const endpoint = pathParts[pathParts.length - 1];

    // Special handling for webhook endpoint (no auth required)
    if (req.method === 'POST' && endpoint === 'webhook') {
      return await handleWebhook(req, supabase);
    }

    // All other endpoints require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    console.log(`[pandadoc-manage] Processing ${req.method} ${endpoint} for user ${user.id}`);

    // Route: GET /integration - Get integration status
    if (req.method === 'GET' && endpoint === 'integration') {
      const { data: integration } = await supabase
        .from('pandadoc_integrations')
        .select('id, workspace_id, default_template_id, is_active, auto_send_enabled, embed_enabled, created_at, last_synced_at')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      return new Response(
        JSON.stringify({
          ok: true,
          connected: !!integration,
          integration: integration || null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route: POST /integration - Create/update integration
    if (req.method === 'POST' && endpoint === 'integration') {
      const body = await req.json();
      console.log('[pandadoc-manage] Received body:', { 
        hasApiKey: !!body.api_key, 
        hasWorkspaceId: !!body.workspace_id 
      });
      
      const { api_key, workspace_id, default_template_id } = body;
      const apiKey = api_key;
      const workspaceId = workspace_id;
      const defaultTemplateId = default_template_id;

      if (!apiKey) {
        throw new Error('API key is required');
      }

      // Test the API key
      const testResponse = await fetch(`${PANDADOC_API_BASE}/templates`, {
        headers: {
          'Authorization': `API-Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!testResponse.ok) {
        throw new Error('Invalid PandaDoc API key');
      }

      // Encrypt the API key
      const encryptedKey = await encryptSecret(apiKey);

      // Check if integration exists
      const { data: existing } = await supabase
        .from('pandadoc_integrations')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error: updateError } = await supabase
          .from('pandadoc_integrations')
          .update({
            api_key_encrypted: encryptedKey,
            workspace_id: workspaceId || null,
            default_template_id: defaultTemplateId || null,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from('pandadoc_integrations')
          .insert({
            user_id: user.id,
            api_key_encrypted: encryptedKey,
            workspace_id: workspaceId || null,
            default_template_id: defaultTemplateId || null,
            is_active: true,
          });

        if (insertError) throw insertError;
      }

      return new Response(
        JSON.stringify({ ok: true, message: 'PandaDoc integration configured successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route: DELETE /integration - Deactivate integration
    if (req.method === 'DELETE' && endpoint === 'integration') {
      const { error } = await supabase
        .from('pandadoc_integrations')
        .update({ is_active: false })
        .eq('user_id', user.id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route: GET /templates - List available templates
    if (req.method === 'GET' && endpoint === 'templates') {
      try {
        const integration = await getPandaDocIntegration(supabase, user.id);
        const templates = await fetchPandaDoc('/templates', integration.apiKey);

        return new Response(
          JSON.stringify({ 
            ok: true, 
            templates: templates.results || [] 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('[pandadoc-manage] Template fetch failed:', error);
        return new Response(
          JSON.stringify({ 
            ok: false, 
            error: error instanceof Error ? error.message : 'Failed to fetch templates',
            templates: []
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Route: POST /create-proposal - Create new proposal
    if (req.method === 'POST' && endpoint === 'create-proposal') {
      const body = await req.json();
      const { dealId, clientId, templateId, title } = body;

      if (!dealId || !clientId || !templateId || !title) {
        throw new Error('Missing required fields: dealId, clientId, templateId, title');
      }

      const integration = await getPandaDocIntegration(supabase, user.id);

      // Fetch deal data
      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .select('*, clients(name, email, company, phone)')
        .eq('id', dealId)
        .single();

      if (dealError || !deal) {
        throw new Error('Deal not found');
      }

      // Fetch client data
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError || !client) {
        throw new Error('Client not found');
      }

      // Prepare recipients
      const recipients = [{
        email: client.email || deal.clients?.email,
        first_name: client.name?.split(' ')[0] || client.contact_person?.split(' ')[0] || 'Client',
        last_name: client.name?.split(' ').slice(1).join(' ') || client.contact_person?.split(' ').slice(1).join(' ') || '',
        role: 'Client',
      }];

      // Prepare tokens (merge fields)
      const tokens = [
        { name: 'Client.Name', value: client.name || client.contact_person || 'Client' },
        { name: 'Client.Email', value: client.email || '' },
        { name: 'Client.Company', value: client.company || '' },
        { name: 'Client.Phone', value: client.phone || '' },
        { name: 'Deal.Title', value: deal.title || '' },
        { name: 'Deal.Amount', value: deal.amount?.toString() || '0' },
        { name: 'Deal.Stage', value: deal.stage || '' },
      ];

      // Create document in PandaDoc
      const pandadocDoc = await fetchPandaDoc('/documents', integration.apiKey, 'POST', {
        name: title,
        template_uuid: templateId,
        recipients,
        tokens,
        metadata: {
          deal_id: dealId,
          client_id: clientId,
          created_by: user.id,
        },
      });

      // Save to database
      const { data: proposal, error: proposalError } = await supabase
        .from('proposal_documents')
        .insert({
          deal_id: dealId,
          client_id: clientId,
          created_by: user.id,
          pandadoc_doc_id: pandadocDoc.id,
          title,
          template_id: templateId,
          status: 'draft',
          metadata: {
            recipients,
            tokens,
          },
        })
        .select()
        .single();

      if (proposalError) throw proposalError;

      console.log(`[pandadoc-manage] Created proposal ${proposal.id} for deal ${dealId}`);

      return new Response(
        JSON.stringify({
          ok: true,
          proposal,
          pandadoc_doc_id: pandadocDoc.id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route: GET /status/:doc_id - Get document status
    if (req.method === 'GET' && pathParts[pathParts.length - 2] === 'status') {
      const docId = pathParts[pathParts.length - 1];
      const integration = await getPandaDocIntegration(supabase, user.id);
      
      const pandadocDoc = await fetchPandaDoc(`/documents/${docId}`, integration.apiKey);

      // Update local database
      await supabase
        .from('proposal_documents')
        .update({
          status: pandadocDoc.status,
          updated_at: new Date().toISOString(),
        })
        .eq('pandadoc_doc_id', docId);

      return new Response(
        JSON.stringify({ status: pandadocDoc.status, document: pandadocDoc }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route: POST /send/:doc_id - Send document to recipient
    if (req.method === 'POST' && pathParts[pathParts.length - 2] === 'send') {
      const docId = pathParts[pathParts.length - 1];
      const integration = await getPandaDocIntegration(supabase, user.id);

      const body = await req.json();
      const { message, subject } = body;

      // Send document
      await fetchPandaDoc(`/documents/${docId}/send`, integration.apiKey, 'POST', {
        message: message || 'Please review and sign this proposal',
        subject: subject || 'Proposal for your review',
        silent: false,
      });

      // Update status
      await supabase
        .from('proposal_documents')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('pandadoc_doc_id', docId);

      console.log(`[pandadoc-manage] Sent proposal ${docId}`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route: GET /embed-url/:doc_id - Get embedded editor URL
    if (req.method === 'GET' && pathParts[pathParts.length - 2] === 'embed-url') {
      const docId = pathParts[pathParts.length - 1];
      const integration = await getPandaDocIntegration(supabase, user.id);

      // Get document status
      const pandadocDoc = await fetchPandaDoc(`/documents/${docId}`, integration.apiKey);
      
      let sessionUrl: string;
      
      // For draft documents: Return PandaDoc dashboard URL (no session API support)
      if (pandadocDoc.status === 'document.draft') {
        sessionUrl = `https://app.pandadoc.com/documents/${docId}`;
      } 
      // For sent documents: Use recipient URL or create session
      else {
        // Use existing recipient URL if available
        if (pandadocDoc.recipient_url) {
          sessionUrl = pandadocDoc.recipient_url;
        } 
        // Create a new session for the user
        else {
          const session = await fetchPandaDoc(
            `/documents/${docId}/session`, 
            integration.apiKey, 
            'POST', 
            {
              recipient: user.email,
              lifetime: 3600,
            }
          );
          sessionUrl = session.url;
        }
      }

      // Update database with session info
      await supabase
        .from('proposal_documents')
        .update({
          editor_url: sessionUrl,
        })
        .eq('pandadoc_doc_id', docId);

      return new Response(
        JSON.stringify({ url: sessionUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route: DELETE /delete/:doc_id - Delete draft proposal
    if (req.method === 'DELETE' && pathParts[pathParts.length - 2] === 'delete') {
      const docId = pathParts[pathParts.length - 1];

      // Get the proposal
      const { data: proposal, error: fetchError } = await supabase
        .from('proposal_documents')
        .select('*')
        .eq('id', docId)
        .maybeSingle();

      if (fetchError || !proposal) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Proposal not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      // Security Check #1: Verify user owns the proposal
      if (proposal.created_by !== user.id) {
        return new Response(
          JSON.stringify({ ok: false, error: 'You do not have permission to delete this proposal' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }

      // Security Check #2: Verify proposal is in draft status
      if (proposal.status !== 'draft') {
        return new Response(
          JSON.stringify({ 
            ok: false, 
            error: 'Only draft proposals can be deleted. Sent proposals cannot be deleted for audit trail purposes.',
            status: proposal.status 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }

      // Optional: Try to delete from PandaDoc (soft failure)
      if (proposal.pandadoc_doc_id) {
        try {
          const integration = await getPandaDocIntegration(supabase, user.id);
          if (integration) {
            await fetchPandaDoc(
              `/documents/${proposal.pandadoc_doc_id}`,
              integration.apiKey,
              'DELETE'
            );
            console.log(`[pandadoc-manage] Deleted document ${proposal.pandadoc_doc_id} from PandaDoc`);
          }
        } catch (error) {
          // Log but don't fail - we still want to delete from our database
          console.error('[pandadoc-manage] Failed to delete from PandaDoc (non-fatal):', error);
        }
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from('proposal_documents')
        .delete()
        .eq('id', docId);

      if (deleteError) {
        console.error('[pandadoc-manage] Database deletion error:', deleteError);
        return new Response(
          JSON.stringify({ ok: false, error: 'Failed to delete proposal from database' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      // Log analytics
      await supabase.from('analytics_data').insert({
        metric_name: 'proposal_deleted',
        metric_value: 1,
        source: 'pandadoc',
        dimensions: {
          user_id: user.id,
          proposal_id: docId,
          pandadoc_doc_id: proposal.pandadoc_doc_id,
        },
      });

      console.log(`[pandadoc-manage] Successfully deleted proposal ${docId}`);

      return new Response(
        JSON.stringify({ ok: true, message: 'Draft proposal deleted successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Endpoint not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[pandadoc-manage] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to get and decrypt integration
async function getPandaDocIntegration(client: any, userId: string): Promise<{ integration: PandaDocIntegration; apiKey: string }> {
  const { data, error } = await client
    .from('pandadoc_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) {
    throw new Error('Active PandaDoc integration not found. Please configure in Integration Manager.');
  }

  const apiKey = await decryptSecret(data.api_key_encrypted);
  if (!apiKey) {
    throw new Error('Failed to decrypt API key');
  }
  return { integration: data, apiKey };
}

// Helper function to call PandaDoc API with retry logic
async function fetchPandaDoc(
  endpoint: string,
  apiKey: string,
  method: string = 'GET',
  body?: any,
  retries: number = 3
): Promise<any> {
  const url = `${PANDADOC_API_BASE}${endpoint}`;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `API-Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // Handle rate limiting with retry
        if (response.status === 429 && attempt < retries) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
          
          console.log(`[pandadoc-manage] Rate limited. Retrying in ${waitTime}ms (attempt ${attempt + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        console.error(`[pandadoc-manage] PandaDoc API error (${response.status}):`, errorText);
        throw new Error(`PandaDoc API error (${response.status}): ${errorText}`);
      }

      return response.json();
    } catch (error) {
      // If it's the last attempt or not a network error, throw
      if (attempt === retries || !(error instanceof TypeError)) {
        throw error;
      }
      
      // Wait before retrying
      const waitTime = Math.pow(2, attempt) * 1000;
      console.log(`[pandadoc-manage] Network error. Retrying in ${waitTime}ms (attempt ${attempt + 1}/${retries})`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw new Error('Max retries exceeded');
}

// Helper function to verify webhook signature
async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );
  
  const expectedSignature = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
    
  return signature === expectedSignature;
}

// Webhook handler function (separated for clarity and security)
async function handleWebhook(req: Request, supabase: any): Promise<Response> {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-pandadoc-signature') || '';
    const webhookSecret = Deno.env.get('PANDADOC_WEBHOOK_SECRET');

    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      const isValid = await verifyWebhookSignature(body, signature, webhookSecret);
      if (!isValid) {
        console.error('[pandadoc-manage] Invalid webhook signature');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }), 
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    const event = JSON.parse(body);
    console.log(`[pandadoc-manage] Webhook event: ${event.event}`, event.data);

    const docId = event.data?.id;
    if (!docId) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch proposal
    const { data: proposal } = await supabase
      .from('proposal_documents')
      .select('*, deals(*)')
      .eq('pandadoc_doc_id', docId)
      .single();

    if (!proposal) {
      console.log(`[pandadoc-manage] Proposal not found for doc ${docId}`);
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle different events
    let updates: any = {
      updated_at: new Date().toISOString(),
    };

    switch (event.event) {
      case 'document_state_changed':
        const newStatus = event.data.status;
        updates.status = newStatus;

        if (newStatus === 'document.viewed') {
          updates.status = 'viewed';
          updates.viewed_at = new Date().toISOString();
          
          // Send notification
          if (proposal.created_by) {
            const shouldNotify = await checkNotificationPreferences(supabase, proposal.created_by, 'proposal_viewed');
            if (shouldNotify) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('email')
                .eq('id', proposal.created_by)
                .single();

              if (profile?.email) {
                await sendProposalNotification(
                  profile.email,
                  'proposal_viewed',
                  {
                    proposalTitle: proposal.title,
                    clientName: proposal.deals?.title || 'Client',
                    dealTitle: proposal.deals?.title || 'Deal',
                    proposalUrl: proposal.recipient_url || '',
                  }
                );
              }
            }
          }

          // Log analytics
          await supabase.from('analytics_data').insert({
            source: 'pandadoc',
            metric_name: 'proposal_viewed',
            metric_value: 1,
            dimensions: {
              proposal_id: proposal.id,
              deal_id: proposal.deal_id,
              client_id: proposal.client_id,
            },
          });

        } else if (newStatus === 'document.completed') {
          updates.status = 'signed';
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

            console.log(`[pandadoc-manage] Updated deal ${proposal.deal_id} to closed_won`);
          }

          // Download PDF
          const { data: integration } = await supabase
            .from('pandadoc_integrations')
            .select('api_key_encrypted')
            .eq('user_id', proposal.created_by)
            .eq('is_active', true)
            .single();

          if (integration) {
            const apiKey = await decryptSecret(integration.api_key_encrypted);
            
            const pdfResponse = await fetch(`${PANDADOC_API_BASE}/documents/${docId}/download`, {
              headers: {
                'Authorization': `API-Key ${apiKey}`,
              },
            });

            if (pdfResponse.ok) {
              const pdfBuffer = await pdfResponse.arrayBuffer();
              const fileName = `proposals/${docId}.pdf`;

              const { error: uploadError } = await supabase.storage
                .from('deal-files')
                .upload(fileName, pdfBuffer, {
                  contentType: 'application/pdf',
                  upsert: true,
                });

              if (!uploadError) {
                updates.pdf_url = fileName;
                console.log(`[pandadoc-manage] Saved PDF to ${fileName}`);
              }
            }
          }

          // Send notification
          if (proposal.created_by) {
            const shouldNotify = await checkNotificationPreferences(supabase, proposal.created_by, 'proposal_signed');
            if (shouldNotify) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('email')
                .eq('id', proposal.created_by)
                .single();

              if (profile?.email) {
                await sendProposalNotification(
                  profile.email,
                  'proposal_signed',
                  {
                    proposalTitle: proposal.title,
                    clientName: proposal.deals?.title || 'Client',
                    dealTitle: proposal.deals?.title || 'Deal',
                    proposalUrl: proposal.recipient_url || '',
                  }
                );
              }
            }
          }

          // Log analytics
          await supabase.from('analytics_data').insert({
            source: 'pandadoc',
            metric_name: 'proposal_signed',
            metric_value: 1,
            dimensions: {
              proposal_id: proposal.id,
              deal_id: proposal.deal_id,
              client_id: proposal.client_id,
            },
          });

        } else if (newStatus === 'document.declined') {
          updates.status = 'declined';
          
          // Send notification
          if (proposal.created_by) {
            const shouldNotify = await checkNotificationPreferences(supabase, proposal.created_by, 'proposal_declined');
            if (shouldNotify) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('email')
                .eq('id', proposal.created_by)
                .single();

              if (profile?.email) {
                await sendProposalNotification(
                  profile.email,
                  'proposal_declined',
                  {
                    proposalTitle: proposal.title,
                    clientName: proposal.deals?.title || 'Client',
                    dealTitle: proposal.deals?.title || 'Deal',
                    proposalUrl: proposal.recipient_url || '',
                  }
                );
              }
            }
          }

          // Log analytics
          await supabase.from('analytics_data').insert({
            source: 'pandadoc',
            metric_name: 'proposal_declined',
            metric_value: 1,
            dimensions: {
              proposal_id: proposal.id,
              deal_id: proposal.deal_id,
              client_id: proposal.client_id,
            },
          });
        }
        break;

      case 'document.sent':
        updates.status = 'sent';
        updates.sent_at = new Date().toISOString();
        
        // Log analytics
        await supabase.from('analytics_data').insert({
          source: 'pandadoc',
          metric_name: 'proposal_sent',
          metric_value: 1,
          dimensions: {
            proposal_id: proposal.id,
            deal_id: proposal.deal_id,
            client_id: proposal.client_id,
          },
        });
        break;
    }

    // Update proposal
    await supabase
      .from('proposal_documents')
      .update(updates)
      .eq('pandadoc_doc_id', docId);

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[pandadoc-manage] Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

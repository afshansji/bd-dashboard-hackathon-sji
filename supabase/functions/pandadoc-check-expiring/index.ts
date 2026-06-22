import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendProposalNotification, checkNotificationPreferences } from "../_shared/notifications.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[pandadoc-check-expiring] Starting expiration check');

    // Calculate date range: 3 days from now (±1 day buffer)
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    threeDaysFromNow.setHours(0, 0, 0, 0);

    const fourDaysFromNow = new Date(threeDaysFromNow);
    fourDaysFromNow.setDate(fourDaysFromNow.getDate() + 1);

    // Find proposals expiring in 3 days that are still active
    const { data: expiringProposals, error: proposalsError } = await supabase
      .from('proposal_documents')
      .select(`
        id,
        pandadoc_doc_id,
        title,
        status,
        expires_at,
        deal_id,
        deals!inner(
          id,
          title,
          owner_id,
          client_id,
          clients(name)
        )
      `)
      .in('status', ['sent', 'viewed'])
      .gte('expires_at', threeDaysFromNow.toISOString())
      .lt('expires_at', fourDaysFromNow.toISOString());

    if (proposalsError) {
      throw proposalsError;
    }

    console.log(`[pandadoc-check-expiring] Found ${expiringProposals?.length || 0} expiring proposals`);

    const results = {
      checked: expiringProposals?.length || 0,
      notificationsSent: 0,
      errors: [] as any[],
    };

    for (const proposal of expiringProposals || []) {
      try {
        const deal = proposal.deals as any;
        const ownerId = deal.owner_id;

        if (!ownerId) {
          console.warn(`[pandadoc-check-expiring] No owner for proposal ${proposal.id}`);
          continue;
        }

        // Get owner's email
        const { data: owner, error: ownerError } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', ownerId)
          .single();

        if (ownerError || !owner?.email) {
          console.error(`[pandadoc-check-expiring] Could not find owner email for user ${ownerId}`);
          continue;
        }

        // Check notification preferences
        const shouldNotify = await checkNotificationPreferences(
          supabase,
          ownerId,
          'proposal_expiring_soon'
        );

        if (!shouldNotify) {
          console.log(`[pandadoc-check-expiring] User ${ownerId} has disabled expiring notifications`);
          continue;
        }

        // Send notification
        await sendProposalNotification(
          owner.email,
          'proposal_expiring',
          {
            proposalTitle: proposal.title,
            clientName: deal.clients?.name || 'Client',
            dealTitle: deal.title,
            expiresAt: proposal.expires_at!,
            proposalUrl: `${Deno.env.get('SUPABASE_URL')}/proposals/${proposal.id}`,
          }
        );

        results.notificationsSent++;

        // Log analytics
        await supabase.from('analytics_data').insert({
          source: 'pandadoc',
          metric_name: 'proposal_expiring_notification_sent',
          metric_value: 1,
          dimensions: {
            proposal_id: proposal.id,
            deal_id: proposal.deal_id,
            days_until_expiry: 3,
          },
          recorded_at: new Date().toISOString(),
        });

        console.log(`[pandadoc-check-expiring] Sent expiring notification for proposal ${proposal.id}`);

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[pandadoc-check-expiring] Error processing proposal ${proposal.id}:`, errorMsg);
        results.errors.push({
          proposal_id: proposal.id,
          error: errorMsg,
        });
      }
    }

    console.log('[pandadoc-check-expiring] Check complete:', results);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[pandadoc-check-expiring] Fatal error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

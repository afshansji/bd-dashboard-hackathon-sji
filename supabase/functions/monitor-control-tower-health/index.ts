import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthSnapshot {
  overall_health_score: number;
  sync_success_rate_24h: number;
  sync_success_rate_7d: number;
  avg_sync_duration_ms: number;
  failed_syncs_count_24h: number;
  pending_push_items: number;
  data_drift_score: number;
  api_response_time_ms: number;
  last_successful_pull: string | null;
  last_successful_push: string | null;
  unmapped_owners_count: number;
  unmapped_pms_count: number;
  unmapped_pods_count: number;
  stale_deals_count: number;
  metrics_detail: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting health monitoring check...');
    const startTime = Date.now();

    // 1. Fetch sync logs from last 24h and 7d
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const { data: logs24h } = await supabase
      .from('control_tower_sync_log')
      .select('*')
      .gte('synced_at', twentyFourHoursAgo.toISOString());

    const { data: logs7d } = await supabase
      .from('control_tower_sync_log')
      .select('*')
      .gte('synced_at', sevenDaysAgo.toISOString());

    // 2. Calculate sync success rates
    const total24h = logs24h?.length || 0;
    const success24h = logs24h?.filter(l => l.status === 'success').length || 0;
    const failed24h = logs24h?.filter(l => l.status === 'failed').length || 0;
    const syncSuccessRate24h = total24h > 0 ? (success24h / total24h) * 100 : 100;

    const total7d = logs7d?.length || 0;
    const success7d = logs7d?.filter(l => l.status === 'success').length || 0;
    const syncSuccessRate7d = total7d > 0 ? (success7d / total7d) * 100 : 100;

    // 3. Calculate average sync duration
    const durations = logs24h
      ?.map(l => l.duration_ms)
      .filter(d => d != null) || [];
    const avgSyncDuration = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

    // 4. Count pending push items (comments + checklist items not synced)
    const { count: pendingComments } = await supabase
      .from('deal_comments')
      .select('*', { count: 'exact', head: true })
      .eq('synced_to_control_tower', false);

    const { count: pendingChecklist } = await supabase
      .from('deal_checklist_items')
      .select('*', { count: 'exact', head: true })
      .eq('synced_to_control_tower', false);

    const pendingPushItems = (pendingComments || 0) + (pendingChecklist || 0);

    // 5. Test Control Tower API response time
    const ctUrl = Deno.env.get('Controltowerurl');
    const ctKey = Deno.env.get('CONTROLTOWERAPIKEY');
    let apiResponseTime = 0;
    let apiReachable = false;

    if (ctUrl && ctKey) {
      try {
        const apiStartTime = Date.now();
        const ctSupabase = createClient(ctUrl, ctKey);
        await ctSupabase.from('User').select('id').limit(1);
        apiResponseTime = Date.now() - apiStartTime;
        apiReachable = true;
      } catch (error) {
        console.error('Control Tower API unreachable:', error);
        apiResponseTime = 10000; // Max penalty
        apiReachable = false;
      }
    }

    // 6. Get mapping statistics
    const { data: healthSummary } = await supabase.rpc('get_sync_health_summary');
    const unmappedOwners = healthSummary?.unmapped_owners || 0;
    const unmappedPms = healthSummary?.unmapped_pms || 0;
    const unmappedPods = healthSummary?.unmapped_pods || 0;

    // 7. Calculate data drift score (deals not synced recently)
    const { data: dealsData } = await supabase
      .from('deals')
      .select('last_synced_at')
      .eq('synced_from_control_tower', true);

    let staleDealCount = 0;
    let driftScore = 100;

    if (dealsData && dealsData.length > 0) {
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      staleDealCount = dealsData.filter(d => 
        !d.last_synced_at || new Date(d.last_synced_at) < oneDayAgo
      ).length;
      driftScore = Math.max(0, 100 - (staleDealCount / dealsData.length) * 100);
    }

    // 8. Get last successful sync timestamps
    const { data: lastPullLog } = await supabase
      .from('control_tower_sync_log')
      .select('synced_at')
      .in('sync_type', ['pull', 'full'])
      .eq('status', 'success')
      .order('synced_at', { ascending: false })
      .limit(1)
      .single();

    const { data: lastPushLog } = await supabase
      .from('control_tower_sync_log')
      .select('synced_at')
      .eq('sync_type', 'push')
      .eq('status', 'success')
      .order('synced_at', { ascending: false })
      .limit(1)
      .single();

    const lastSuccessfulPull = lastPullLog?.synced_at || null;
    const lastSuccessfulPush = lastPushLog?.synced_at || null;

    // 9. Calculate hours since last sync
    const hoursSinceLastSync = lastSuccessfulPull
      ? (now.getTime() - new Date(lastSuccessfulPull).getTime()) / (1000 * 60 * 60)
      : 48; // Default to 48h if no sync

    // 10. Calculate total deals for mapping score
    const { count: totalDeals } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('synced_from_control_tower', true);

    const unmappedTotal = unmappedOwners + unmappedPms + unmappedPods;

    // 11. Calculate overall health score
    const { data: healthScoreResult } = await supabase.rpc('calculate_health_score', {
      p_sync_success_rate_24h: syncSuccessRate24h,
      p_api_response_time_ms: apiResponseTime,
      p_unmapped_total: unmappedTotal,
      p_total_deals: totalDeals || 0,
      p_hours_since_last_sync: hoursSinceLastSync,
      p_failed_count_24h: failed24h,
      p_total_syncs_24h: total24h,
    });

    const overallHealthScore = healthScoreResult?.total_score || 0;

    // 12. Insert health snapshot
    const snapshot: HealthSnapshot = {
      overall_health_score: overallHealthScore,
      sync_success_rate_24h: syncSuccessRate24h,
      sync_success_rate_7d: syncSuccessRate7d,
      avg_sync_duration_ms: avgSyncDuration,
      failed_syncs_count_24h: failed24h,
      pending_push_items: pendingPushItems,
      data_drift_score: driftScore,
      api_response_time_ms: apiResponseTime,
      last_successful_pull: lastSuccessfulPull,
      last_successful_push: lastSuccessfulPush,
      unmapped_owners_count: unmappedOwners,
      unmapped_pms_count: unmappedPms,
      unmapped_pods_count: unmappedPods,
      stale_deals_count: staleDealCount,
      metrics_detail: {
        total_syncs_24h: total24h,
        successful_syncs_24h: success24h,
        api_reachable: apiReachable,
        breakdown: healthScoreResult?.breakdown || {}
      }
    };

    const { error: insertError } = await supabase
      .from('control_tower_health_snapshots')
      .insert(snapshot);

    if (insertError) {
      console.error('Failed to insert health snapshot:', insertError);
    }

    // 13. Generate alerts based on thresholds
    await generateAlerts(supabase, {
      failed24h,
      avgSyncDuration,
      driftScore,
      unmappedTotal,
      hoursSinceLastSync,
      apiReachable
    });

    // 14. Auto-resolve alerts
    await supabase.rpc('auto_resolve_alerts');

    const duration = Date.now() - startTime;
    console.log(`Health check completed in ${duration}ms. Score: ${overallHealthScore}`);

    return new Response(
      JSON.stringify({
        ...snapshot,
        duration_ms: duration
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Health monitoring error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateAlerts(supabase: any, metrics: {
  failed24h: number;
  avgSyncDuration: number;
  driftScore: number;
  unmappedTotal: number;
  hoursSinceLastSync: number;
  apiReachable: boolean;
}) {
  const { data: configs } = await supabase
    .from('control_tower_alert_config')
    .select('*')
    .eq('enabled', true);

  if (!configs) return;

  for (const config of configs) {
    let shouldAlert = false;
    let title = '';
    let message = '';
    let severity = config.severity_threshold;
    let metadata = {};

    switch (config.alert_type) {
      case 'sync_failure':
        if (metrics.failed24h >= (config.threshold_value || 3)) {
          shouldAlert = true;
          title = `${metrics.failed24h} Sync Failures Detected`;
          message = `There have been ${metrics.failed24h} failed sync operations in the last hour. Please investigate Control Tower connectivity.`;
          metadata = { failed_count: metrics.failed24h };
        }
        break;

      case 'high_latency':
        if (metrics.avgSyncDuration >= (config.threshold_value || 5000)) {
          shouldAlert = true;
          title = 'High Sync Latency Detected';
          message = `Average sync duration is ${(metrics.avgSyncDuration / 1000).toFixed(1)}s, exceeding the ${(config.threshold_value / 1000)}s threshold.`;
          metadata = { avg_duration_ms: metrics.avgSyncDuration };
        }
        break;

      case 'data_drift':
        if (metrics.driftScore < (config.threshold_value || 60)) {
          shouldAlert = true;
          title = 'Data Synchronization Drift Detected';
          message = `Data drift score is ${metrics.driftScore.toFixed(1)}%, indicating deals are not syncing regularly.`;
          metadata = { drift_score: metrics.driftScore };
        }
        break;

      case 'mapping_issue':
        if (metrics.unmappedTotal > (config.threshold_value || 10)) {
          shouldAlert = true;
          title = 'Multiple Unmapped Items';
          message = `${metrics.unmappedTotal} items (owners, PMs, or PODs) are not properly mapped from Control Tower.`;
          metadata = { unmapped_count: metrics.unmappedTotal };
        }
        break;

      case 'stale_data':
        if (metrics.hoursSinceLastSync > (config.threshold_value || 24)) {
          shouldAlert = true;
          title = 'Stale Data Detected';
          message = `No successful sync in ${Math.round(metrics.hoursSinceLastSync)} hours. Data may be outdated.`;
          metadata = { hours_since_sync: metrics.hoursSinceLastSync };
          severity = 'warning';
        }
        break;

      case 'api_unreachable':
        if (!metrics.apiReachable) {
          shouldAlert = true;
          title = 'Control Tower API Unreachable';
          message = 'Unable to connect to Control Tower API. Please verify credentials and network connectivity.';
          severity = 'critical';
        }
        break;
    }

    if (shouldAlert) {
      await supabase.rpc('generate_alert', {
        p_alert_type: config.alert_type,
        p_severity: severity,
        p_title: title,
        p_message: message,
        p_metadata: metadata
      });
    }
  }
}

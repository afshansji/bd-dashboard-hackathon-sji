import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    console.log('[calculate-performance-metrics] Starting daily metrics calculation');

    // Calculate yesterday's metrics
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const periodStart = yesterday.toISOString().split('T')[0];
    const periodEnd = yesterday.toISOString().split('T')[0];

    // Get all active users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id');

    if (profilesError) {
      throw profilesError;
    }

    console.log(`[calculate-performance-metrics] Processing ${profiles?.length || 0} users`);

    let successCount = 0;
    let errorCount = 0;

    // Calculate metrics for each user
    for (const profile of profiles || []) {
      try {
        // Call the calculate function
        const { data: metricsData, error: metricsError } = await supabase
          .rpc('calculate_user_performance_metrics', {
            p_user_id: profile.id,
            p_period_start: periodStart,
            p_period_end: periodEnd,
          });

        if (metricsError) {
          console.error(`[calculate-performance-metrics] Error for user ${profile.id}:`, metricsError);
          errorCount++;
          continue;
        }

        // Upsert the metrics
        const { error: upsertError } = await supabase
          .from('user_performance_metrics')
          .upsert({
            user_id: profile.id,
            metric_period: 'daily',
            period_start: periodStart,
            period_end: periodEnd,
            ...metricsData,
          }, {
            onConflict: 'user_id,metric_period,period_start',
          });

        if (upsertError) {
          console.error(`[calculate-performance-metrics] Upsert error for user ${profile.id}:`, upsertError);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error(`[calculate-performance-metrics] Exception for user ${profile.id}:`, error);
        errorCount++;
      }
    }

    console.log(`[calculate-performance-metrics] Complete - Success: ${successCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: profiles?.length || 0,
        successCount,
        errorCount,
        date: periodStart,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[calculate-performance-metrics] Fatal error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

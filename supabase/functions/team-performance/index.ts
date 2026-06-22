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

    const url = new URL(req.url);
    const period = url.searchParams.get('period') || 'monthly';
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const userId = url.searchParams.get('userId');

    console.log(`[team-performance] Fetching metrics - period: ${period}, user: ${userId}`);

    // Calculate default date range if not provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch performance metrics
    let query = supabase
      .from('user_performance_metrics')
      .select(`
        *,
        profiles:user_id (
          full_name,
          email
        )
      `)
      .eq('metric_period', period)
      .gte('period_start', start.toISOString().split('T')[0])
      .lte('period_end', end.toISOString().split('T')[0])
      .order('performance_score', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: metrics, error: metricsError } = await query;

    if (metricsError) {
      throw metricsError;
    }

    // Format team members with rankings
    const teamMembers = metrics?.map((metric, index) => ({
      userId: metric.user_id,
      userName: metric.profiles?.full_name || metric.profiles?.email || 'Unknown User',
      metrics: metric,
      rank: index + 1,
    })) || [];

    // Create leaderboard
    const leaderboard = teamMembers
      .sort((a, b) => Number(b.metrics.performance_score) - Number(a.metrics.performance_score))
      .slice(0, 10)
      .map((member) => ({
        userId: member.userId,
        userName: member.userName,
        performanceScore: Number(member.metrics.performance_score),
      }));

    console.log(`[team-performance] Returning data for ${teamMembers.length} team members`);

    return new Response(
      JSON.stringify({ teamMembers, leaderboard }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[team-performance] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

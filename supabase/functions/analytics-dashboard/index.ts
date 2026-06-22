import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyticsQuery {
  period?: '7d' | '30d' | '90d' | 'custom';
  source?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
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
    const period = url.searchParams.get('period') || '30d';
    const source = url.searchParams.get('source');
    const userId = url.searchParams.get('userId');
    
    console.log(`[analytics-dashboard] Fetching analytics for period: ${period}, source: ${source}`);

    // Calculate date range
    const endDate = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Fetch analytics data
    let query = supabase
      .from('analytics_data')
      .select('*')
      .gte('recorded_at', startDate.toISOString())
      .lte('recorded_at', endDate.toISOString())
      .order('recorded_at', { ascending: true });

    if (source) {
      query = query.eq('source', source);
    }

    const { data: analyticsData, error: analyticsError } = await query;

    if (analyticsError) {
      throw analyticsError;
    }

    // Group data by date and metric
    const timeSeriesData: Record<string, Record<string, number>> = {};
    const metricTotals: Record<string, number> = {};

    analyticsData?.forEach((record) => {
      const dateKey = new Date(record.recorded_at).toISOString().split('T')[0];
      
      if (!timeSeriesData[dateKey]) {
        timeSeriesData[dateKey] = {};
      }
      
      if (!timeSeriesData[dateKey][record.metric_name]) {
        timeSeriesData[dateKey][record.metric_name] = 0;
      }
      
      timeSeriesData[dateKey][record.metric_name] += Number(record.metric_value);
      
      if (!metricTotals[record.metric_name]) {
        metricTotals[record.metric_name] = 0;
      }
      metricTotals[record.metric_name] += Number(record.metric_value);
    });

    // Convert to array format
    const timeSeriesArray = Object.entries(timeSeriesData).map(([date, metrics]) => ({
      date,
      metrics,
    }));

    // Calculate top metrics with mock change percentages
    const topMetrics = Object.entries(metricTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, value]) => ({
        name,
        value: Number(value),
        change: Math.random() * 40 - 10, // Mock change for now
      }));

    const response = {
      timeSeriesData: timeSeriesArray,
      topMetrics,
      summary: {
        totalEvents: analyticsData?.length || 0,
        periodStart: startDate.toISOString(),
        periodEnd: endDate.toISOString(),
      },
    };

    console.log(`[analytics-dashboard] Returning ${analyticsData?.length || 0} records`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[analytics-dashboard] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AnalyticsTimeSeriesData {
  date: string;
  metrics: Record<string, number>;
}

export interface AnalyticsTopMetric {
  name: string;
  value: number;
  change: number;
}

export interface AnalyticsDashboardData {
  timeSeriesData: AnalyticsTimeSeriesData[];
  topMetrics: AnalyticsTopMetric[];
  summary: {
    totalEvents: number;
    periodStart: string;
    periodEnd: string;
  };
}

interface UseAnalyticsDashboardOptions {
  period?: '7d' | '30d' | '90d' | 'custom';
  source?: string;
  startDate?: Date;
  endDate?: Date;
  userId?: string;
}

export function useAnalyticsDashboard(options: UseAnalyticsDashboardOptions = {}) {
  const { period = '30d', source, startDate, endDate, userId } = options;

  return useQuery({
    queryKey: ['analytics-dashboard', period, source, startDate, endDate, userId],
    queryFn: async () => {
      const params = new URLSearchParams({
        period,
        ...(source && { source }),
        ...(userId && { userId }),
      });

      const { data, error } = await supabase.functions.invoke('analytics-dashboard', {
        body: {},
        method: 'GET',
      });

      if (error) throw error;

      return data as AnalyticsDashboardData;
    },
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });
}

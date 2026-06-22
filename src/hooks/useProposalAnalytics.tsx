import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProposalAnalyticsMetrics {
  totalProposals: number;
  sentCount: number;
  viewedCount: number;
  signedCount: number;
  declinedCount: number;
  conversionRate: number;
  avgTimeToSign: number;
  activeProposals: number;
}

export interface ConversionFunnelData {
  stage: string;
  count: number;
  percentage: number;
}

export interface TimeSeriesDataPoint {
  date: string;
  sent: number;
  viewed: number;
  signed: number;
  declined: number;
}

export interface TemplatePerformance {
  templateId: string;
  templateName: string;
  totalUsed: number;
  signedCount: number;
  conversionRate: number;
  avgTimeToSign: number;
}

interface UseProposalAnalyticsOptions {
  period?: '7d' | '30d' | '90d';
  startDate?: Date;
  endDate?: Date;
}

export function useProposalAnalytics(options: UseProposalAnalyticsOptions = {}) {
  const { period = '30d' } = options;

  return useQuery({
    queryKey: ['proposal-analytics', period],
    queryFn: async () => {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
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
      }

      // Fetch proposals data
      const { data: proposals, error: proposalsError } = await supabase
        .from('proposal_documents')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (proposalsError) throw proposalsError;

      // Fetch analytics data
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('analytics_data')
        .select('*')
        .eq('source', 'pandadoc')
        .gte('recorded_at', startDate.toISOString())
        .lte('recorded_at', endDate.toISOString());

      if (analyticsError) throw analyticsError;

      // Calculate metrics
      const totalProposals = proposals?.length || 0;
      const sentCount = proposals?.filter(p => ['sent', 'viewed', 'signed', 'declined'].includes(p.status)).length || 0;
      const viewedCount = proposals?.filter(p => ['viewed', 'signed'].includes(p.status)).length || 0;
      const signedCount = proposals?.filter(p => p.status === 'signed').length || 0;
      const declinedCount = proposals?.filter(p => p.status === 'declined').length || 0;
      const activeProposals = proposals?.filter(p => ['sent', 'viewed'].includes(p.status)).length || 0;

      const conversionRate = sentCount > 0 ? (signedCount / sentCount) * 100 : 0;

      // Calculate average time to sign
      const signedProposals = proposals?.filter(p => p.status === 'signed' && p.sent_at && p.completed_at) || [];
      const avgTimeToSign = signedProposals.length > 0
        ? signedProposals.reduce((sum, p) => {
            const sentDate = new Date(p.sent_at!);
            const signedDate = new Date(p.completed_at!);
            const days = (signedDate.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24);
            return sum + days;
          }, 0) / signedProposals.length
        : 0;

      const metrics: ProposalAnalyticsMetrics = {
        totalProposals,
        sentCount,
        viewedCount,
        signedCount,
        declinedCount,
        conversionRate,
        avgTimeToSign,
        activeProposals,
      };

      // Build conversion funnel
      const funnelData: ConversionFunnelData[] = [
        {
          stage: 'Sent',
          count: sentCount,
          percentage: 100,
        },
        {
          stage: 'Viewed',
          count: viewedCount,
          percentage: sentCount > 0 ? (viewedCount / sentCount) * 100 : 0,
        },
        {
          stage: 'Signed',
          count: signedCount,
          percentage: sentCount > 0 ? (signedCount / sentCount) * 100 : 0,
        },
      ];

      // Build time series data
      const timeSeriesMap = new Map<string, TimeSeriesDataPoint>();
      
      proposals?.forEach(proposal => {
        const dateKey = new Date(proposal.created_at).toISOString().split('T')[0];
        if (!timeSeriesMap.has(dateKey)) {
          timeSeriesMap.set(dateKey, { date: dateKey, sent: 0, viewed: 0, signed: 0, declined: 0 });
        }
        const point = timeSeriesMap.get(dateKey)!;
        
        if (proposal.status === 'sent') point.sent++;
        if (proposal.status === 'viewed') point.viewed++;
        if (proposal.status === 'signed') point.signed++;
        if (proposal.status === 'declined') point.declined++;
      });

      const timeSeriesData = Array.from(timeSeriesMap.values()).sort((a, b) => 
        a.date.localeCompare(b.date)
      );

      // Build template performance (mock data for now - would need template_id in proposals)
      const templatePerformance: TemplatePerformance[] = [];

      return {
        metrics,
        funnelData,
        timeSeriesData,
        templatePerformance,
      };
    },
    refetchInterval: 60000, // Refetch every minute
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface CampaignFinancialData {
  id: string;
  campaign_id: string;
  total_budget: number;
  actual_spend: number;
  cost_per_contact: number;
  cost_per_meeting: number;
  deals_revenue: number;
  average_deal_value: number;
  projected_revenue: number;
  roi_percentage: number;
  cost_per_deal: number;
  last_calculated_at: string;
}

export interface CampaignROIData {
  campaignId: string;
  financials: CampaignFinancialData;
  breakdown: {
    totalCost: number;
    totalRevenue: number;
    netProfit: number;
    roi: number;
  };
  projections: {
    projectedDeals: number;
    projectedRevenue: number;
    projectedROI: number;
  };
}

export function useCampaignROI(campaignId: string) {
  return useQuery({
    queryKey: ['campaign-roi', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('campaign-roi', {
        body: { campaignId },
      });

      if (error) throw error;

      return data as CampaignROIData;
    },
    enabled: !!campaignId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

interface UpdateROIAssumptions {
  campaignId: string;
  avgDealValue?: number;
  costPerContact?: number;
}

export function useUpdateCampaignROI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, avgDealValue, costPerContact }: UpdateROIAssumptions) => {
      const { data, error } = await supabase.functions.invoke('campaign-roi', {
        body: {
          campaignId,
          avgDealValue,
          costPerContact,
        },
      });

      if (error) throw error;

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-roi', variables.campaignId] });
      toast({
        title: 'ROI Updated',
        description: 'Campaign financial assumptions have been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

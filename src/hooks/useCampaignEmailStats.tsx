import { useQuery } from '@tanstack/react-query';
import { getCampaignDetail, listCampaigns } from '@/Api/adminCampaigns';

/**
 * Hook to fetch total emails sent count across all active campaigns
 * Aggregates from server-calculated campaign stats.
 */
export const useTotalEmailsSent = () => {
  return useQuery({
    queryKey: ['campaign-emails-total-sent'],
    queryFn: async () => {
      const pageSize = 100;
      let page = 1;
      let total = 0;
      let totalEmailsSent = 0;

      do {
        const response = await listCampaigns({
          page,
          pageSize,
          status: 'active',
        });

        total = response.total;
        totalEmailsSent += response.data.reduce((sum, campaign) => sum + (campaign.emails_sent ?? 0), 0);
        page += 1;
      } while ((page - 1) * pageSize < total);

      return totalEmailsSent;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};

/**
 * Hook to fetch emails sent count for a specific campaign
 * Uses server-calculated campaign stats.
 */
export const useCampaignEmailsSent = (campaignId?: string) => {
  return useQuery({
    queryKey: ['campaign-emails-sent', campaignId],
    enabled: Boolean(campaignId),
    queryFn: async () => {
      if (!campaignId) return 0;
      const response = await getCampaignDetail(campaignId);
      return response.campaign.emails_sent ?? 0;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};

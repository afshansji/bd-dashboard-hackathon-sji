import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  listCampaigns,
  createCampaign as createCampaignApi,
  updateCampaign as updateCampaignApi,
  archiveCampaign,
  type CampaignSummary,
  type CampaignUpdateRequest,
  type CampaignListResponse,
  type CampaignPayload,
  type CampaignCreateOptions,
} from '@/Api/adminCampaigns';
import { logUserActivity } from '@/services/userActivityService';

export type BDCampaign = CampaignSummary;

interface CreateVariables {
  campaign: CampaignPayload;
  options?: CampaignCreateOptions;
}

interface UpdateVariables {
  id: string;
  campaign?: CampaignUpdateRequest['campaign'];
  metrics?: CampaignUpdateRequest['metrics'];
  options?: CampaignCreateOptions;
}

type DeleteVariables = { id: string } | string;

function buildOptimisticCampaign(id: string, payload: CampaignPayload): CampaignSummary {
  const now = new Date().toISOString();
  return {
    id,
    slug: `${payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-temp`,
    name: payload.name,
    niche_id: payload.niche_id,
    brand_id: payload.brand_id ?? null,
    campaign_type: payload.campaign_types?.[0] || payload.campaign_type || 'other',
    campaign_types: payload.campaign_types || [],
    status: payload.status ?? 'planning',
    ghl_campaign_id: payload.ghl_campaign_id ?? null,
    linkedin_campaign_id: payload.linkedin_campaign_id ?? null,
    ai_agent_id: payload.ai_agent_id ?? null,
    content_template: payload.content_template ?? null,
    research_data: payload.research_data ?? null,
    linkedin_stats: payload.linkedin_stats ?? null,
    ghl_stats: payload.ghl_stats ?? null,
    contacts_summary: payload.contacts_summary ?? null,
    start_date: payload.start_date ?? null,
    end_date: payload.end_date ?? null,
    target_contacts: payload.target_contacts ?? null,
    target_regions: payload.target_regions ?? null,
    target_contacts_count: payload.target_contacts_count ?? null,
    actual_contacts_reached: payload.actual_contacts_reached ?? null,
    responses_received: payload.responses_received ?? null,
    meetings_booked: payload.meetings_booked ?? null,
    emails_sent: 0,
    linkedin_requests_sent: 0,
    deals_generated: payload.deals_generated ?? null,
    owned_by: payload.owned_by ?? null,
    created_by: payload.created_by ?? null,
    created_at: now,
    updated_at: now,
    brand: null,
    owner: null,
    creator: null,
    kpis: [],
    analytics_summary: [],
  };
}

export const useBDCampaigns = (
  nicheId?: string,
  page: number = 1,
  limit: number = 12,
  search?: string,
  status?: string,
  ownerId?: string
) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const queryKey = ['admin-campaigns', { nicheId, page, limit, search, status, ownerId }];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await listCampaigns({
        nicheId,
        page,
        pageSize: limit,
        search: search || undefined,
        status: status && status !== 'all' ? status as any : undefined,
        ownerId: ownerId && ownerId !== 'all' ? ownerId : undefined
      });
      return response;
    },
  });

  const campaigns = data?.data ?? [];

  const createCampaign = useMutation({
    mutationFn: async (variables: CreateVariables) => {
      return await createCampaignApi({ campaign: variables.campaign, options: variables.options });
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<CampaignListResponse>(queryKey);

      if (previous) {
        const optimistic = buildOptimisticCampaign(`temp-${Date.now()}`, variables.campaign);
        queryClient.setQueryData<CampaignListResponse>(queryKey, {
          ...previous,
          data: [optimistic, ...previous.data],
          total: previous.total + 1,
        });
      }

      return { previous };
    },
    onSuccess: (campaign) => {
      queryClient.setQueryData<CampaignListResponse>(queryKey, (current) => {
        if (!current) return current;
        const filtered = current.data.filter((item) => !item.id.startsWith('temp-'));
        return {
          ...current,
          data: [campaign, ...filtered],
          total: Math.max(current.total, filtered.length + 1),
        };
      });
      toast({
        title: 'Success',
        description: 'Campaign created successfully',
      });
      if (user?.id) {
        void logUserActivity({
          userId: user.id,
          action: 'campaign_created',
          resourceType: 'campaign',
          resourceId: campaign.id,
        });
      }
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateCampaign = useMutation({
    mutationFn: async (variables: UpdateVariables) => {
      const { id, campaign, metrics, options } = variables;
      return await updateCampaignApi(id, { campaign, metrics, options });
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<CampaignListResponse>(queryKey);

      if (previous && variables.campaign) {
        queryClient.setQueryData<CampaignListResponse>(queryKey, {
          ...previous,
          data: previous.data.map((item) =>
            item.id === variables.id ? { ...item, ...variables.campaign, updated_at: new Date().toISOString() } : item
          ),
        });
      }

      return { previous };
    },
    onSuccess: (campaign) => {
      queryClient.setQueryData<CampaignListResponse>(queryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          data: current.data.map((item) => (item.id === campaign.id ? campaign : item)),
        };
      });
      toast({
        title: 'Success',
        description: 'Campaign updated successfully',
      });
      if (user?.id) {
        void logUserActivity({
          userId: user.id,
          action: 'campaign_updated',
          resourceType: 'campaign',
          resourceId: campaign.id,
        });
      }
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (variables: DeleteVariables) => {
      const id = typeof variables === 'string' ? variables : variables.id;
      await archiveCampaign(id);
    },
    onMutate: async (variables) => {
      const id = typeof variables === 'string' ? variables : variables.id;
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<CampaignListResponse>(queryKey);

      if (previous) {
        queryClient.setQueryData<CampaignListResponse>(queryKey, {
          ...previous,
          data: previous.data.filter((item) => item.id !== id),
          total: Math.max(previous.total - 1, 0),
        });
      }

      return { previous };
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Campaign archived successfully',
      });
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      console.error('Campaign deletion error:', error);
      toast({
        title: 'Deletion Failed',
        description: error.message || 'Unable to delete campaign. Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    campaigns,
    total: data?.total ?? campaigns.length,
    isLoading,
    error,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    refetch,
  };
};

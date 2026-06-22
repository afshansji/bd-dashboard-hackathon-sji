import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import axiosPrivate from '@/lib/axiosPrivate';
import type {
  CampaignAITask,
  CampaignActivity,
  CampaignAnalyticsPoint,
  CampaignAIAgentRun,
  CampaignContact,
  CampaignContactStatus,
  CampaignDetailIntegrations,
  CampaignDetailResponse,
  CampaignKpi,
  CampaignProjectTask,
  UpdateCampaignPayload,
} from '@/features/campaign-detail/types';
import type { BDCampaign } from './useBDCampaigns';

const defaultContactByStatus = (): Record<CampaignContactStatus, CampaignContact[]> => ({
  identified: [],
  researched: [],
  client_not_ideal: [],
  contacted_linkedin: [],
  contacted_social: [],
  connected: [],
  client_not_responsive: [],
  messaged: [],
  contacted_email: [],
  responded: [],
  meeting_booked: [],
  close_lost: [],
  won: [],
});

const buildIntegrationFallback = (
  integrations?: CampaignDetailIntegrations,
): CampaignDetailIntegrations => ({
  n8n: integrations?.n8n ?? { status: 'pending', message: 'Waiting for first sync run.' },
  hubspot: integrations?.hubspot ?? { status: 'not_configured', message: 'HubSpot sync not configured yet.' },
  ghl: integrations?.ghl ?? { status: 'pending', message: 'Waiting for GoHighLevel sync.' },
});

export const useCampaignDetail = (campaignId?: string) => {
  const queryClient = useQueryClient();

  const campaignQuery = useQuery({
    queryKey: ['admin-campaign-detail', campaignId],
    enabled: Boolean(campaignId),
    queryFn: async () => {
      const { data } = await axiosPrivate.get<CampaignDetailResponse>(`/admin-campaigns/${campaignId}`);
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: UpdateCampaignPayload) => {
      if (!campaignId) {
        throw new Error('Campaign ID is required to update campaign');
      }

      const { data } = await axiosPrivate.put<CampaignDetailResponse>(`/admin-campaigns/${campaignId}`, payload);
      return data;
    },
    onSuccess: () => {
      if (!campaignId) return;
      // Invalidate the detail query for this specific campaign
      queryClient.invalidateQueries({ queryKey: ['admin-campaign-detail', campaignId] });
      // Invalidate all campaign list queries to refresh the tiles/listing
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] });
    },
  });

  const detail = campaignQuery.data;

  const contacts = useMemo(
    () => (detail?.contacts as CampaignContact[] | undefined) ?? [],
    [detail?.contacts],
  );

  const activities = useMemo(
    () => (detail?.activities as CampaignActivity[] | undefined) ?? [],
    [detail?.activities],
  );

  const tasks = useMemo(() => {
    const aiTaskList = (detail?.ai_tasks as CampaignAITask[] | undefined) ?? [];
    if (aiTaskList.length > 0) {
      return aiTaskList;
    }

    const projectTaskRecords = detail?.project_tasks as CampaignProjectTask[] | undefined;
    if (!projectTaskRecords || projectTaskRecords.length === 0) {
      return [];
    }
    return mapProjectTasksToAITasks(projectTaskRecords as unknown as Array<Record<string, unknown>>, campaignId);
  }, [detail?.ai_tasks, detail?.project_tasks, campaignId]);

  const contactByStatus = useMemo(() => {
    const buckets = defaultContactByStatus();

    contacts.forEach((contact) => {
      if (buckets[contact.status]) {
        buckets[contact.status].push(contact);
      }
    });

    return buckets;
  }, [contacts]);

  const integrations: CampaignDetailIntegrations = buildIntegrationFallback(detail?.integrations);

  const analytics: CampaignAnalyticsPoint[] = detail?.analytics_data ?? [];
  const kpis: CampaignKpi[] = detail?.linked_kpis ?? [];
  const projectTasks: CampaignProjectTask[] = detail?.project_tasks ?? [];
  const aiAgentRuns: CampaignAIAgentRun[] = detail?.ai_agent_runs ?? [];

  const markCompleted = async () =>
    updateMutation.mutateAsync({ campaign: { status: 'completed' } });

  const softArchive = async () => updateMutation.mutateAsync({ campaign: { status: 'archived' } });

  return {
    campaign: detail?.campaign as BDCampaign | undefined,
    contacts,
    activities,
    tasks,
    analytics,
    kpis,
    projectTasks,
    aiAgentRuns,
    integrations,
    aiSummary: detail?.campaign?.ai_summary ?? detail?.campaign?.insights_summary ?? null,
    aiPostMortem: detail?.campaign?.ai_post_mortem ?? null,
    contactByStatus,
    refetch: campaignQuery.refetch,
    updateCampaign: updateMutation.mutateAsync,
    markCompleted,
    softArchive,
    isUpdating: updateMutation.isPending,
    isLoading: campaignQuery.isLoading,
    isError: campaignQuery.isError,
    error: campaignQuery.error ?? null,
  };
};

export const mapProjectTasksToAITasks = (
  projectTasks: Array<Record<string, unknown>>,
  campaignId?: string,
): CampaignAITask[] => {
  if (!projectTasks || projectTasks.length === 0) {
    return [];
  }

  return projectTasks.map((task) => {
    const status = normalizeTaskStatus(task.status);
    const createdAt = typeof task.created_at === 'string' ? task.created_at : new Date().toISOString();
    const updatedAt = typeof task.updated_at === 'string' ? task.updated_at : createdAt;

    return {
      id: String(task.id ?? `task-${Math.random().toString(36).slice(2)}`),
      campaign_id: campaignId ?? String(task.project_id ?? ''),
      contact_id: null,
      task_type: 'personalization',
      agent_id: null,
      input_data: {
        title: task.title,
        description: task.description,
        priority: task.priority,
      },
      output_data: null,
      status,
      created_at: createdAt,
      updated_at: updatedAt,
      completed_at: typeof task.completed_at === 'string' ? task.completed_at : null,
    };
  });
};

export const normalizeTaskStatus = (status: unknown): CampaignAITask['status'] => {
  if (typeof status !== 'string') {
    return 'pending';
  }

  const lower = status.toLowerCase();
  if (lower.includes('progress') || lower === 'in_progress') {
    return 'running';
  }
  if (lower === 'done' || lower === 'completed' || lower === 'complete') {
    return 'completed';
  }
  if (lower === 'failed') {
    return 'failed';
  }
  return 'pending';
};

export type {
  CampaignAITask,
  CampaignActivity,
  CampaignAnalyticsPoint,
  CampaignAIAgentRun,
  CampaignContact,
  CampaignContactStatus,
  CampaignDetailIntegrations,
  CampaignKpi,
  CampaignProjectTask,
  UpdateCampaignPayload,
} from '@/features/campaign-detail/types';

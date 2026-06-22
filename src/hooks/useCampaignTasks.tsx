import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Hook to fetch tasks associated with a specific campaign
 */
export function useCampaignTasks(campaignId?: string) {
  return useQuery({
    queryKey: ['campaign-tasks', campaignId],
    queryFn: async () => {
      if (!campaignId) return [];

      const { data, error } = await supabase
        .from('project_tasks')
        .select('*, projects(*)')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!campaignId,
    staleTime: 30000, // 30 seconds
    retry: 2,
  });
}

/**
 * Hook to update a task's campaign assignment
 */
export function useUpdateTaskCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      campaignId
    }: {
      taskId: string;
      campaignId?: string | null
    }) => {
      const { error } = await supabase
        .from('project_tasks')
        .update({ campaign_id: campaignId })
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
      toast({
        title: 'Success',
        description: 'Task campaign assignment updated',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to create a task with campaign assignment
 */
export function useCreateCampaignTask(campaignId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskData: any) => {
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('project_tasks')
        .insert([{
          ...taskData,
          campaign_id: campaignId || taskData.campaign_id || null,
          created_by: userData?.user?.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
      toast({
        title: 'Success',
        description: 'Task created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

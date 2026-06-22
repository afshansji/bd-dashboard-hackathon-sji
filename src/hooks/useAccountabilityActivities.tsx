import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { logUserActivity } from '@/services/userActivityService';

// Types
export type ActivityFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'one_time';
export type ActivityStatus = 'active' | 'paused' | 'completed';

export interface AccountabilityActivity {
  id: string;
  rep_goal_id: string;
  title: string;
  description: string | null;
  frequency: ActivityFrequency;
  target_count: number;
  current_count: number;
  linked_task_id: string | null;
  status: ActivityStatus;
  created_at: string;
  updated_at: string;
  // Joined data
  linked_task?: {
    id: string;
    title: string;
    status: string;
  };
}

export interface CreateActivityData {
  rep_goal_id: string;
  title: string;
  description?: string;
  frequency: ActivityFrequency;
  target_count: number;
  linked_task_id?: string;
}

export interface UpdateActivityData {
  title?: string;
  description?: string;
  frequency?: ActivityFrequency;
  target_count?: number;
  current_count?: number;
  linked_task_id?: string;
  status?: ActivityStatus;
}

// Helper to enrich activities with linked tasks
async function enrichActivitiesWithTasks(activities: any[]): Promise<AccountabilityActivity[]> {
  if (!activities || activities.length === 0) return [];
  
  const taskIds = [...new Set(activities.map(a => a.linked_task_id).filter(Boolean))];
  
  if (taskIds.length === 0) return activities as AccountabilityActivity[];
  
  const { data: tasks } = await supabase
    .from('project_tasks')
    .select('id, title, status')
    .in('id', taskIds);
  
  const taskMap = new Map((tasks || []).map(t => [t.id, t]));
  
  return activities.map(activity => ({
    ...activity,
    linked_task: activity.linked_task_id ? taskMap.get(activity.linked_task_id) : undefined,
  })) as AccountabilityActivity[];
}

// Hook to fetch activities for a rep goal
export function useActivities(repGoalId: string | undefined) {
  return useQuery({
    queryKey: ['accountability-activities', repGoalId],
    queryFn: async () => {
      if (!repGoalId) return [];

      const { data, error } = await (supabase
        .from('accountability_activities' as any)
        .select('*')
        .eq('rep_goal_id', repGoalId)
        .order('created_at', { ascending: false }) as any);

      if (error) throw error;
      return enrichActivitiesWithTasks(data || []);
    },
    enabled: !!repGoalId,
  });
}

// Hook to fetch a single activity
export function useActivity(activityId: string | undefined) {
  return useQuery({
    queryKey: ['accountability-activity', activityId],
    queryFn: async () => {
      if (!activityId) return null;

      const { data, error } = await (supabase
        .from('accountability_activities' as any)
        .select('*')
        .eq('id', activityId)
        .single() as any);

      if (error) throw error;
      
      const enriched = await enrichActivitiesWithTasks([data]);
      return enriched[0] || null;
    },
    enabled: !!activityId,
  });
}

// Hook to create an activity
export function useCreateActivity() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (activityData: CreateActivityData) => {
      const { data, error } = await (supabase
        .from('accountability_activities' as any)
        .insert(activityData)
        .select()
        .single() as any);

      if (error) throw error;
      return data as AccountabilityActivity;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['accountability-activities', data.rep_goal_id] });
      queryClient.invalidateQueries({ queryKey: ['accountability-rep-goal', data.rep_goal_id] });
      toast.success('Activity created successfully');
      if (user?.id) {
        void logUserActivity({
          userId: user.id,
          action: 'accountability_activity_created',
          resourceType: 'accountability_activity',
          resourceId: data.id,
        });
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to create activity: ${error.message}`);
    },
  });
}

// Hook to update an activity
export function useUpdateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateActivityData }) => {
      const { data, error } = await (supabase
        .from('accountability_activities' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single() as any);

      if (error) throw error;
      return data as AccountabilityActivity;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['accountability-activities', data.rep_goal_id] });
      queryClient.invalidateQueries({ queryKey: ['accountability-activity', data.id] });
      queryClient.invalidateQueries({ queryKey: ['accountability-rep-goal', data.rep_goal_id] });
      toast.success('Activity updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update activity: ${error.message}`);
    },
  });
}

// Hook to link a task to an activity
export function useLinkTaskToActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ activityId, taskId }: { activityId: string; taskId: string | null }) => {
      const { data, error } = await (supabase
        .from('accountability_activities' as any)
        .update({ linked_task_id: taskId })
        .eq('id', activityId)
        .select()
        .single() as any);

      if (error) throw error;
      return data as AccountabilityActivity;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['accountability-activities', data.rep_goal_id] });
      queryClient.invalidateQueries({ queryKey: ['accountability-activity', data.id] });
      const message = data.linked_task_id ? 'Task linked successfully' : 'Task unlinked successfully';
      toast.success(message);
    },
    onError: (error: Error) => {
      toast.error(`Failed to link task: ${error.message}`);
    },
  });
}

// Hook to delete an activity
export function useDeleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activityId: string) => {
      const { error } = await (supabase
        .from('accountability_activities' as any)
        .delete()
        .eq('id', activityId) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accountability-activities'] });
      toast.success('Activity deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete activity: ${error.message}`);
    },
  });
}

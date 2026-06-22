import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { GoalStatus } from './useAccountabilityGoals';
import { logUserActivity } from '@/services/userActivityService';

// Types
export interface AccountabilityWeeklyUpdate {
  id: string;
  activity_id: string;
  week_start_date: string;
  week_end_date: string;
  progress_value: number;
  progress_percentage: number;
  status: GoalStatus;
  blockers: string | null;
  help_needed: string | null;
  notes: string | null;
  submitted_by: string;
  created_at: string;
  updated_at: string;
  // Joined data
  submitter?: {
    id: string;
    email: string;
    full_name: string | null;
  };
}

export interface CreateWeeklyUpdateData {
  activity_id: string;
  week_start_date: string;
  week_end_date: string;
  progress_value: number;
  progress_percentage: number;
  status: GoalStatus;
  blockers?: string;
  help_needed?: string;
  notes?: string;
}

export interface UpdateWeeklyUpdateData {
  progress_value?: number;
  progress_percentage?: number;
  status?: GoalStatus;
  blockers?: string;
  help_needed?: string;
  notes?: string;
}

// Helper to enrich updates with submitter profiles
async function enrichUpdatesWithProfiles(updates: any[]): Promise<AccountabilityWeeklyUpdate[]> {
  if (!updates || updates.length === 0) return [];
  
  const userIds = [...new Set(updates.map(u => u.submitted_by).filter(Boolean))];
  
  if (userIds.length === 0) return updates as AccountabilityWeeklyUpdate[];
  
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', userIds);
  
  const profileMap = new Map((profiles || []).map(p => [p.id, p]));
  
  return updates.map(update => ({
    ...update,
    submitter: profileMap.get(update.submitted_by) || undefined,
  })) as AccountabilityWeeklyUpdate[];
}

// Hook to fetch weekly updates for an activity
export function useWeeklyUpdates(activityId: string | undefined) {
  return useQuery({
    queryKey: ['accountability-weekly-updates', activityId],
    queryFn: async () => {
      if (!activityId) return [];

      const { data, error } = await (supabase
        .from('accountability_weekly_updates' as any)
        .select('*')
        .eq('activity_id', activityId)
        .order('week_start_date', { ascending: false }) as any);

      if (error) throw error;
      return enrichUpdatesWithProfiles(data || []);
    },
    enabled: !!activityId,
  });
}

// Hook to fetch a single weekly update
export function useWeeklyUpdate(updateId: string | undefined) {
  return useQuery({
    queryKey: ['accountability-weekly-update', updateId],
    queryFn: async () => {
      if (!updateId) return null;

      const { data, error } = await (supabase
        .from('accountability_weekly_updates' as any)
        .select('*')
        .eq('id', updateId)
        .single() as any);

      if (error) throw error;
      const enriched = await enrichUpdatesWithProfiles([data]);
      return enriched[0] || null;
    },
    enabled: !!updateId,
  });
}

// Hook to fetch updates for a specific week
export function useWeeklyUpdateForWeek(activityId: string | undefined, weekStartDate: string | undefined) {
  return useQuery({
    queryKey: ['accountability-weekly-update-week', activityId, weekStartDate],
    queryFn: async () => {
      if (!activityId || !weekStartDate) return null;

      const { data, error } = await (supabase
        .from('accountability_weekly_updates' as any)
        .select('*')
        .eq('activity_id', activityId)
        .eq('week_start_date', weekStartDate)
        .maybeSingle() as any);

      if (error) throw error;
      if (!data) return null;
      
      const enriched = await enrichUpdatesWithProfiles([data]);
      return enriched[0] || null;
    },
    enabled: !!activityId && !!weekStartDate,
  });
}

// Hook to create a weekly update
export function useCreateWeeklyUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updateData: CreateWeeklyUpdateData) => {
      const { data: { user } } = await supabase.auth.getUser();

      const insertData = {
        ...updateData,
        submitted_by: user?.id,
      };

      const { data, error } = await (supabase
        .from('accountability_weekly_updates' as any)
        .insert(insertData)
        .select()
        .single() as any);

      if (error) throw error;

      // Update activity current_count directly
      const { data: activity } = await (supabase
        .from('accountability_activities' as any)
        .select('current_count')
        .eq('id', updateData.activity_id)
        .single() as any);
      
      if (activity) {
        await (supabase
          .from('accountability_activities' as any)
          .update({ current_count: (activity.current_count || 0) + updateData.progress_value })
          .eq('id', updateData.activity_id) as any);
      }

      return data as AccountabilityWeeklyUpdate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['accountability-weekly-updates', data.activity_id] });
      queryClient.invalidateQueries({ queryKey: ['accountability-activity', data.activity_id] });
      queryClient.invalidateQueries({ queryKey: ['accountability-activities'] });
      queryClient.invalidateQueries({ queryKey: ['accountability-rep-goals'] });
      toast.success('Weekly update submitted successfully');
      if (data?.submitted_by) {
        void logUserActivity({
          userId: data.submitted_by,
          action: 'accountability_update_submitted',
          resourceType: 'accountability_weekly_update',
          resourceId: data.id,
        });
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit weekly update: ${error.message}`);
    },
  });
}

// Hook to update a weekly update
export function useUpdateWeeklyUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateWeeklyUpdateData }) => {
      const { data, error } = await (supabase
        .from('accountability_weekly_updates' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single() as any);

      if (error) throw error;
      return data as AccountabilityWeeklyUpdate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['accountability-weekly-updates', data.activity_id] });
      queryClient.invalidateQueries({ queryKey: ['accountability-weekly-update', data.id] });
      queryClient.invalidateQueries({ queryKey: ['accountability-activity', data.activity_id] });
      toast.success('Weekly update updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update weekly update: ${error.message}`);
    },
  });
}

// Hook to delete a weekly update
export function useDeleteWeeklyUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updateId: string) => {
      const { error } = await (supabase
        .from('accountability_weekly_updates' as any)
        .delete()
        .eq('id', updateId) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accountability-weekly-updates'] });
      queryClient.invalidateQueries({ queryKey: ['accountability-activities'] });
      toast.success('Weekly update deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete weekly update: ${error.message}`);
    },
  });
}

// Helper function to get week start and end dates
export function getWeekDates(date: Date = new Date()): { start: string; end: string } {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  
  const monday = new Date(date);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  };
}

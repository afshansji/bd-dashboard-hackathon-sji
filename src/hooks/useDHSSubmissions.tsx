import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DHSSubmission, DHSSubmissionFormData, DHSTeamSummary, DHSSubmissionWithUser } from '@/types/dhs';
import { logUserActivity } from '@/services/userActivityService';

export function useDHSSubmissions(userId?: string, date?: Date) {
  const dateStr = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['dhs-submissions', userId, dateStr],
    queryFn: async () => {
      let query = supabase
        .from('dhs_submissions')
        .select('*')
        .eq('date', dateStr);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DHSSubmission[];
    },
  });
}

export function useMyDHSHistory(userId?: string, dateRange?: { start?: string; end?: string }) {
  return useQuery({
    queryKey: ['dhs-history', userId, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('dhs_submissions')
        .select('*');

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (dateRange?.start) {
        query = query.gte('date', dateRange.start);
      }

      if (dateRange?.end) {
        query = query.lte('date', dateRange.end);
      }

      query = query.order('date', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data as DHSSubmission[];
    },
  });
}

export function useTodayDHSSubmission(userId?: string) {
  const today = new Date().toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ['dhs-today', userId, today],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('dhs_submissions')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle();

      if (error) throw error;
      return data as DHSSubmission | null;
    },
    enabled: !!userId,
  });
}

export function useSubmitDHS() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (submission: DHSSubmissionFormData & { date: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('dhs_submissions')
        .insert({
          user_id: user.id,
          date: submission.date,
          content: submission.content,
        })
        .select()
        .single();

      if (error) throw error;
      return data as DHSSubmission;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dhs-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['dhs-history'] });
      queryClient.invalidateQueries({ queryKey: ['dhs-today'] });
      queryClient.invalidateQueries({ queryKey: ['dhs-team-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dhs-all-submissions'] });
      if (data?.user_id) {
        void logUserActivity({
          userId: data.user_id,
          action: 'dhs_submitted',
          resourceType: 'dhs_submission',
          resourceId: data.id,
          metadata: { date: data.date },
        });
      }
    },
  });
}

export function useUpdateDHS() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: {
      id: string;
      updates: Partial<DHSSubmissionFormData>;
    }) => {
      const { data, error } = await supabase
        .from('dhs_submissions')
        .update({
          content: updates.content,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as DHSSubmission;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dhs-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['dhs-history'] });
      queryClient.invalidateQueries({ queryKey: ['dhs-today'] });
      queryClient.invalidateQueries({ queryKey: ['dhs-team-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dhs-all-submissions'] });
      if (data?.user_id) {
        void logUserActivity({
          userId: data.user_id,
          action: 'dhs_updated',
          resourceType: 'dhs_submission',
          resourceId: data.id,
          metadata: { date: data.date },
        });
      }
    },
  });
}

export function useAllDHSSubmissions(dateFilter?: string) {
  return useQuery({
    queryKey: ['dhs-all-submissions', dateFilter],
    queryFn: async () => {
      let query = supabase
        .from('dhs_submissions')
        .select('*')
        .order('date', { ascending: false });

      if (dateFilter === 'today') {
        const today = new Date().toISOString().split('T')[0];
        query = query.eq('date', today);
      } else if (dateFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('date', weekAgo.toISOString().split('T')[0]);
      } else if (dateFilter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte('date', monthAgo.toISOString().split('T')[0]);
      }

      const { data: submissions, error: submissionsError } = await query;
      if (submissionsError) throw submissionsError;
      
      if (!submissions || submissions.length === 0) {
        return [] as DHSSubmissionWithUser[];
      }

      // Get unique user IDs
      const userIds = [...new Set(submissions.map(s => s.user_id))];
      
      // Fetch profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);
      
      if (profilesError) throw profilesError;
      
      // Map profiles to submissions
      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const result: DHSSubmissionWithUser[] = submissions.map(s => ({
        id: s.id,
        user_id: s.user_id,
        date: s.date,
        content: s.content,
        created_at: s.created_at,
        updated_at: s.updated_at,
        profiles: profilesMap.get(s.user_id)
          ? {
              full_name: profilesMap.get(s.user_id)?.full_name || undefined,
              email: profilesMap.get(s.user_id)?.email || ''
            }
          : undefined
      }));
      
      return result;
    },
  });
}

export function useDHSTeamSummary(date?: Date) {
  const dateStr = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['dhs-team-summary', dateStr],
    queryFn: async () => {
      // Get all submissions for the date
      const { data: submissions, error: submissionsError } = await supabase
        .from('dhs_submissions')
        .select('*')
        .eq('date', dateStr);

      if (submissionsError) throw submissionsError;

      // Get total active users count
      const { count: totalUsers, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .not('id', 'is', null);

      if (usersError) throw usersError;

      const submissionsData = submissions as DHSSubmission[];
      const total_submissions = submissionsData.length;
      const submission_rate = totalUsers ? (total_submissions / totalUsers) * 100 : 0;

      const summary: DHSTeamSummary = {
        date: dateStr,
        total_submissions,
        submission_rate,
      };

      return summary;
    },
  });
}


import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TeamDailySummary {
  id: string;
  date: string;
  total_hours: number;
  team_size: number;
  summary: string;
  created_at: string;
  updated_at: string;
}

export function useTeamSummaries(date?: Date) {
  const dateStr = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ['team-summaries', dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_summaries')
        .select('*')
        .eq('date', dateStr)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TeamDailySummary[];
    },
  });
}

export function useEODSubmissions(userId?: string, date?: Date) {
  const dateStr = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['eod-submissions', userId, dateStr],
    queryFn: async () => {
      let query = supabase
        .from('eod_submissions')
        .select('*')
        .eq('date', dateStr);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useMyEODHistory(userId?: string, dateRange?: { start?: string; end?: string }) {
  return useQuery({
    queryKey: ['eod-history', userId, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('eod_submissions')
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
      return data;
    },
  });
}

export function useSubmitEOD() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (submission: {
      date: string;
      tasks_completed?: string;
      tomorrow_plan?: string;
      challenges?: string;
      hours_worked?: number;
      project_id?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('eod_submissions')
        .insert({
          user_id: user.id,
          ...submission,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eod-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['team-summaries'] });
      queryClient.invalidateQueries({ queryKey: ['eod-history'] });
    },
  });
}

export function useUpdateEOD() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: {
      id: string;
      updates: {
        tasks_completed?: string;
        tomorrow_plan?: string | null;
        challenges?: string | null;
        hours_worked?: number | null;
      };
    }) => {
      const { data, error } = await supabase
        .from('eod_submissions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eod-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['team-summaries'] });
      queryClient.invalidateQueries({ queryKey: ['eod-history'] });
    },
  });
}

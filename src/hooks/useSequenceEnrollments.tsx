import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef } from "react";

interface EnrollmentFilters {
  sequenceId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useSequenceEnrollments(filters?: EnrollmentFilters) {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const query = useQuery({
    queryKey: ['sequence-enrollments', filters],
    queryFn: async () => {
      let query = supabase
        .from('contact_sequence_enrollments')
        .select(`
          id,
          status,
          enrolled_at,
          last_step_executed_at,
          next_step_scheduled_at,
          total_sent,
          total_to_send,
          contact:campaign_contacts(
            id,
            contact_name,
            contact_email,
            contact_company,
            status
          ),
          sequence:campaign_sequences(
            id,
            name,
            status
          ),
          current_step:sequence_steps(
            id,
            step_order,
            channel,
            content_template
          )
        `)
        .order('enrolled_at', { ascending: false });

      if (filters?.sequenceId) {
        query = query.eq('sequence_id', filters.sequenceId);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.dateFrom) {
        query = query.gte('enrolled_at', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('enrolled_at', filters.dateTo);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });

  // Realtime subscription with debouncing
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout>;

    // Clean up existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    // Create new subscription
    const channel = supabase
      .channel('sequence-enrollments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contact_sequence_enrollments',
        },
        (payload) => {
          // Debounce rapid updates to prevent UI thrashing
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            // Apply filter logic to avoid unnecessary refetches
            let shouldUpdate = true;

            if (filters?.sequenceId && payload.new && 'sequence_id' in payload.new) {
              shouldUpdate = payload.new.sequence_id === filters.sequenceId;
            }

            if (shouldUpdate) {
              queryClient.invalidateQueries({ queryKey: ['sequence-enrollments'] });
              queryClient.invalidateQueries({ queryKey: ['sequence-metrics'] });
            }
          }, 500);
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    // Cleanup on unmount
    return () => {
      clearTimeout(debounceTimer);
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [queryClient, filters?.sequenceId]);

  return query;
}

export function useSequenceMetrics(sequenceId?: string) {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const query = useQuery({
    queryKey: ['sequence-metrics', sequenceId],
    queryFn: async () => {
      let query = supabase
        .from('contact_sequence_enrollments')
        .select('*');

      if (sequenceId) {
        query = query.eq('sequence_id', sequenceId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const total = data?.length || 0;
      const active = data?.filter(e => e.status === 'active').length || 0;
      const completed = data?.filter(e => e.status === 'completed').length || 0;
      const failed = data?.filter(e => e.status === 'failed').length || 0;
      const paused = data?.filter(e => e.status === 'paused').length || 0;

      const successRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0';

      return {
        total,
        active,
        completed,
        failed,
        paused,
        successRate,
      };
    },
  });

  // Realtime subscription for metrics
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout>;

    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    const channel = supabase
      .channel('sequence-metrics')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contact_sequence_enrollments',
        },
        (payload) => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            let shouldUpdate = true;

            if (sequenceId && payload.new && 'sequence_id' in payload.new) {
              shouldUpdate = payload.new.sequence_id === sequenceId;
            }

            if (shouldUpdate) {
              queryClient.invalidateQueries({ queryKey: ['sequence-metrics'] });
            }
          }, 500);
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      clearTimeout(debounceTimer);
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [queryClient, sequenceId]);

  return query;
}

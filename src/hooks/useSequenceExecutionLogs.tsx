import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef } from "react";

interface LogFilters {
  enrollmentId?: string;
  status?: string;
  stepType?: string;
  limit?: number;
}

export function useSequenceExecutionLogs(filters?: LogFilters) {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const query = useQuery({
    queryKey: ['sequence-execution-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('sequence_execution_log')
        .select(`
          *,
          enrollment:contact_sequence_enrollments(
            id,
            contact:campaign_contacts(
              id,
              contact_name,
              contact_email
            ),
            sequence:campaign_sequences(
              id,
              name
            )
          ),
          step:sequence_steps(
            id,
            step_order,
            channel,
            action_type
          )
        `)
        .order('executed_at', { ascending: false })
        .limit(filters?.limit || 100);

      if (filters?.enrollmentId) {
        query = query.eq('enrollment_id', filters.enrollmentId);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.stepType) {
        query = query.eq('step.channel', filters.stepType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });

  // Realtime subscription
  useEffect(() => {
    // Clean up existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    // Create new subscription
    const channel = supabase
      .channel('sequence-execution-logs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sequence_execution_log',
        },
        (payload) => {
          // Invalidate queries to refetch data
          queryClient.invalidateQueries({ queryKey: ['sequence-execution-logs'] });
          queryClient.invalidateQueries({ queryKey: ['sequence-enrollments'] });
          queryClient.invalidateQueries({ queryKey: ['sequence-metrics'] });
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [queryClient]);

  return query;
}

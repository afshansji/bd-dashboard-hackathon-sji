import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface LogFilters {
  sequenceId?: string;
  contactId?: string;
  contactSearch?: string;
  statuses?: string[];
  channels?: string[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'executed_at' | 'status' | 'contact_name';
  sortOrder?: 'asc' | 'desc';
}

export interface ExecutionLogWithDetails {
  id: string;
  enrollment_id: string;
  step_id: string;
  status: string;
  executed_at: string;
  error_message?: string;
  metadata?: any;
  enrollment: {
    id: string;
    contact_id: string;
    contact: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      company: string;
    };
  };
  step: {
    id: string;
    step_order: number;
    channel: string;
    content_template: any;
  };
  sequence: {
    id: string;
    name: string;
  };
}

export interface LogsResponse {
  logs: ExecutionLogWithDetails[];
  totalCount: number;
}

export function useSequenceExecutionLogsAdvanced(filters: LogFilters = {}) {
  const queryClient = useQueryClient();
  const {
    sequenceId,
    contactId,
    contactSearch,
    statuses,
    channels,
    dateFrom,
    dateTo,
    search,
    page = 1,
    pageSize = 50,
    sortBy = 'executed_at',
    sortOrder = 'desc',
  } = filters;

  const logsQuery = useQuery({
    queryKey: ['sequence-execution-logs-advanced', filters],
    queryFn: async (): Promise<LogsResponse> => {
      // Build the query
      let query = supabase
        .from('sequence_execution_log')
        .select(`
          id,
          enrollment_id,
          step_id,
          status,
          executed_at,
          error_message,
          metadata,
          enrollment:contact_sequence_enrollments!inner (
            id,
            contact_id,
            contact:campaign_contacts!inner (
              id,
              first_name,
              last_name,
              email,
              company
            )
          ),
          step:sequence_steps!inner (
            id,
            step_order,
            channel,
            content_template,
            sequence:campaign_sequences!inner (
              id,
              name
            )
          )
        `, { count: 'exact' });

      // Apply filters
      if (sequenceId) {
        query = query.eq('step.sequence.id', sequenceId);
      }

      if (contactId) {
        query = query.eq('enrollment.contact_id', contactId);
      }

      if (contactSearch) {
        query = query.or(
          `enrollment.contact.first_name.ilike.%${contactSearch}%,enrollment.contact.last_name.ilike.%${contactSearch}%,enrollment.contact.email.ilike.%${contactSearch}%`,
        );
      }

      if (statuses && statuses.length > 0) {
        query = query.in('status', statuses);
      }

      if (channels && channels.length > 0) {
        query = query.in('step.channel', channels);
      }

      if (dateFrom) {
        query = query.gte('executed_at', dateFrom);
      }

      if (dateTo) {
        query = query.lte('executed_at', dateTo);
      }

      if (search) {
        query = query.or(
          `error_message.ilike.%${search}%,enrollment.contact.first_name.ilike.%${search}%,enrollment.contact.last_name.ilike.%${search}%`
        );
      }

      // Apply sorting
      const ascending = sortOrder === 'asc';
      query = query.order(sortBy, { ascending });

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      // Transform data to flatten nested structure
      const logs = (data || []).map((log: any) => ({
        id: log.id,
        enrollment_id: log.enrollment_id,
        step_id: log.step_id,
        status: log.status,
        executed_at: log.executed_at,
        error_message: log.error_message,
        metadata: log.metadata,
        enrollment: {
          id: log.enrollment.id,
          contact_id: log.enrollment.contact_id,
          contact: log.enrollment.contact,
        },
        step: {
          id: log.step.id,
          step_order: log.step.step_order,
          channel: log.step.channel,
          content_template: log.step.content_template,
        },
        sequence: log.step.sequence,
      }));

      return {
        logs,
        totalCount: count || 0,
      };
    },
  });

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('execution-logs-advanced')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sequence_execution_log',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['sequence-execution-logs-advanced'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return logsQuery;
}

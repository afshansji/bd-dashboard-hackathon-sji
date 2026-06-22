import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type FollowUpStatus = 'pending' | 'completed' | 'cancelled' | 'overdue';
export type FollowUpType = 'email' | 'call' | 'linkedin' | 'meeting' | 'other';
export type FollowUpPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface FollowUp {
  id: string;
  user_id: string;
  date: string;
  topic: string;
  contact: string;
  outcome?: string;
  next_step?: string;
  deal_id?: string;
  campaign_contact_id?: string;
  status: FollowUpStatus;
  followup_type: FollowUpType;
  priority: FollowUpPriority;
  ai_generated_message?: string;
  completed_at?: string;
  reminder_sent: boolean;
  auto_generated: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export function useFollowUps(filters?: {
  status?: FollowUpStatus;
  type?: FollowUpType;
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: ['followups', filters],
    queryFn: async () => {
      let query = supabase
        .from('followups')
        .select('*')
        .order('date', { ascending: true });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.type) {
        query = query.eq('followup_type', filters.type);
      }
      if (filters?.dateFrom) {
        query = query.gte('date', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('date', filters.dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FollowUp[];
    },
  });
}

export function useFollowUpMutations() {
  const queryClient = useQueryClient();

  const createFollowUp = useMutation({
    mutationFn: async (followUp: Partial<FollowUp>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, created_at, updated_at, user_id, ...insertData } = followUp as any;

      const { data, error } = await supabase
        .from('followups')
        .insert({ ...insertData, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      toast.success('Follow-up created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create follow-up: ${error.message}`);
    },
  });

  const updateFollowUp = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FollowUp> & { id: string }) => {
      const { data, error } = await supabase
        .from('followups')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      toast.success('Follow-up updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update follow-up: ${error.message}`);
    },
  });

  const deleteFollowUp = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('followups')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      toast.success('Follow-up deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete follow-up: ${error.message}`);
    },
  });

  const completeFollowUp = useMutation({
    mutationFn: async ({ id, outcome, next_step }: { id: string; outcome?: string; next_step?: string }) => {
      const { data, error } = await supabase
        .from('followups')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          outcome,
          next_step,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      toast.success('Follow-up marked as completed');
    },
    onError: (error) => {
      toast.error(`Failed to complete follow-up: ${error.message}`);
    },
  });

  return {
    createFollowUp,
    updateFollowUp,
    deleteFollowUp,
    completeFollowUp,
  };
}

export function useGenerateFollowUpSuggestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dealId, contactId }: { dealId?: string; contactId?: string }) => {
      console.log('[useGenerateFollowUpSuggestions] Invoking edge function with:', { dealId, contactId });
      
      const { data, error } = await supabase.functions.invoke('generate-followup-suggestions', {
        body: { dealId, contactId }
      });

      if (error) {
        console.error('[useGenerateFollowUpSuggestions] Edge function error:', error);
        throw error;
      }
      
      console.log('[useGenerateFollowUpSuggestions] Success:', data);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['followup-suggestions'] });
      
      if (data.count === 0) {
        toast.info(data.message || 'No suggestions generated. Try adding some active deals or campaign contacts.');
      } else {
        toast.success(`Generated ${data.count} follow-up suggestion${data.count === 1 ? '' : 's'}`);
      }
      
      if (data.errors && data.errors.length > 0) {
        console.warn('[useGenerateFollowUpSuggestions] Partial errors:', data.errors);
      }
    },
    onError: (error: any) => {
      console.error('[useGenerateFollowUpSuggestions] Mutation error:', error);
      const errorMsg = error?.message || error?.error || 'Unknown error';
      toast.error(`Failed to generate suggestions: ${errorMsg}`);
    },
  });
}

export function useFollowUpSuggestions(dealId?: string, contactId?: string) {
  return useQuery({
    queryKey: ['followup-suggestions', dealId, contactId],
    queryFn: async () => {
      let query = supabase
        .from('followup_suggestions')
        .select('*')
        .is('accepted_at', null)
        .is('rejected_at', null)
        .order('suggested_date', { ascending: true });

      if (dealId) {
        query = query.eq('deal_id', dealId);
      }
      if (contactId) {
        query = query.eq('campaign_contact_id', contactId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!dealId || !!contactId,
  });
}

export function useAcceptSuggestion() {
  const queryClient = useQueryClient();
  const { createFollowUp } = useFollowUpMutations();

  return useMutation({
    mutationFn: async (suggestion: any) => {
      // Create follow-up from suggestion
      const followUpData = await createFollowUp.mutateAsync({
        date: suggestion.suggested_date,
        topic: suggestion.metadata?.topic || 'Follow-up',
        contact: suggestion.metadata?.contact || '',
        followup_type: suggestion.suggested_type,
        priority: suggestion.suggested_priority,
        ai_generated_message: suggestion.ai_message_draft,
        deal_id: suggestion.deal_id,
        campaign_contact_id: suggestion.campaign_contact_id,
        auto_generated: true,
        status: 'pending',
      });

      // Mark suggestion as accepted
      const { error } = await supabase
        .from('followup_suggestions')
        .update({
          accepted_at: new Date().toISOString(),
          created_followup_id: followUpData.id,
        })
        .eq('id', suggestion.id);

      if (error) throw error;
      return followUpData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followup-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['followups'] });
    },
  });
}

export function useRejectSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (suggestionId: string) => {
      const { error } = await supabase
        .from('followup_suggestions')
        .update({ rejected_at: new Date().toISOString() })
        .eq('id', suggestionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followup-suggestions'] });
    },
  });
}

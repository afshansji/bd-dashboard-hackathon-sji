import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export type QuarterStatus = 'planning' | 'active' | 'completed' | 'archived';

export interface AccountabilityQuarter {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: QuarterStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateQuarterData {
  name: string;
  start_date: string;
  end_date: string;
  status?: QuarterStatus;
}

export interface UpdateQuarterData {
  name?: string;
  start_date?: string;
  end_date?: string;
  status?: QuarterStatus;
}

// Hook to fetch all quarters
export function useQuarters() {
  return useQuery({
    queryKey: ['accountability-quarters'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('accountability_quarters' as any)
        .select('*')
        .order('start_date', { ascending: false }) as any);

      if (error) throw error;
      return (data || []) as AccountabilityQuarter[];
    },
  });
}

// Hook to fetch a single quarter
export function useQuarter(quarterId: string | undefined) {
  return useQuery({
    queryKey: ['accountability-quarter', quarterId],
    queryFn: async () => {
      if (!quarterId) return null;

      const { data, error } = await (supabase
        .from('accountability_quarters' as any)
        .select('*')
        .eq('id', quarterId)
        .single() as any);

      if (error) throw error;
      return data as AccountabilityQuarter;
    },
    enabled: !!quarterId,
  });
}

// Hook to fetch the current active quarter
export function useActiveQuarter() {
  return useQuery({
    queryKey: ['accountability-active-quarter'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('accountability_quarters' as any)
        .select('*')
        .eq('status', 'active')
        .gte('end_date', new Date().toISOString().split('T')[0])
        .lte('start_date', new Date().toISOString().split('T')[0])
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle() as any);

      if (error) throw error;
      return data as AccountabilityQuarter | null;
    },
  });
}

// Hook to create a quarter
export function useCreateQuarter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quarterData: CreateQuarterData) => {
      const { data, error } = await (supabase
        .from('accountability_quarters' as any)
        .insert(quarterData)
        .select()
        .single() as any);

      if (error) throw error;
      return data as AccountabilityQuarter;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accountability-quarters'] });
      queryClient.invalidateQueries({ queryKey: ['accountability-active-quarter'] });
      toast.success('Quarter created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create quarter: ${error.message}`);
    },
  });
}

// Hook to update a quarter
export function useUpdateQuarter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateQuarterData }) => {
      const { data, error } = await (supabase
        .from('accountability_quarters' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single() as any);

      if (error) throw error;
      return data as AccountabilityQuarter;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['accountability-quarters'] });
      queryClient.invalidateQueries({ queryKey: ['accountability-quarter', data.id] });
      queryClient.invalidateQueries({ queryKey: ['accountability-active-quarter'] });
      toast.success('Quarter updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update quarter: ${error.message}`);
    },
  });
}

// Hook to delete a quarter
export function useDeleteQuarter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('accountability_quarters' as any)
        .delete()
        .eq('id', id) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accountability-quarters'] });
      queryClient.invalidateQueries({ queryKey: ['accountability-active-quarter'] });
      toast.success('Quarter deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete quarter: ${error.message}`);
    },
  });
}

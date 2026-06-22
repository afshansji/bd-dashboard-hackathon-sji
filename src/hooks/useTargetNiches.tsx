import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TargetNiche {
  id: string;
  pod_id?: string;
  name: string;
  description?: string;
  services?: string[];
  industries?: string[];
  target_contacts?: string[];
  target_regions?: string[];
  employee_size_min?: number;
  employee_size_max?: number;
  revenue_min?: number;
  revenue_max?: number;
  business_type?: string;
  pain_points?: string[];
  dreams?: string[];
  status: 'active' | 'researching' | 'paused' | 'retired';
  priority: 'high' | 'medium' | 'low';
  target_revenue?: number;
  target_clients?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export const useTargetNiches = (podId?: string, page: number = 1, limit: number = 12) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['target_niches', podId, page, limit],
    queryFn: async () => {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      
      let query = (supabase as any)
        .from('target_niches')
        .select('*', { count: 'exact' })
        .order('name')
        .range(from, to);
      
      if (podId) {
        query = query.eq('pod_id', podId);
      }
      
      const { data, error, count } = await query;
      if (error) throw error;
      
      return {
        data: data as TargetNiche[],
        total: count || 0,
      };
    },
  });
  
  const niches = data?.data || [];

  const createNiche = useMutation({
    mutationFn: async (niche: Partial<TargetNiche>) => {
      const { data, error } = await (supabase as any)
        .from('target_niches')
        .insert([niche])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['target_niches'] });
      toast({
        title: 'Success',
        description: 'Niche created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateNiche = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TargetNiche> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('target_niches')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['target_niches'] });
      toast({
        title: 'Success',
        description: 'Niche updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteNiche = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('target_niches')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['target_niches'] });
      toast({
        title: 'Success',
        description: 'Niche deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    niches,
    total: data?.total || 0,
    isLoading,
    error,
    createNiche,
    updateNiche,
    deleteNiche,
  };
};

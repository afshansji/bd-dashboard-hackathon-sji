import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MarketingEffort {
  id: string;
  niche_id: string;
  brand_id?: string;
  effort_type: 'content_marketing' | 'social_media' | 'paid_ads' | 'seo' | 'webinar' | 'email_campaign' | 'other';
  title: string;
  description?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  start_date?: string;
  end_date?: string;
  budget_allocated?: number;
  budget_spent: number;
  impressions: number;
  clicks: number;
  leads_generated: number;
  owned_by?: string;
  created_at: string;
  updated_at: string;
}

export const useMarketingEfforts = (nicheId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: efforts, isLoading, error } = useQuery({
    queryKey: ['marketing_niche_efforts', nicheId],
    queryFn: async () => {
      let query = (supabase as any)
        .from('marketing_niche_efforts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (nicheId) {
        query = query.eq('niche_id', nicheId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as MarketingEffort[];
    },
  });

  const createEffort = useMutation({
    mutationFn: async (effort: Partial<MarketingEffort>) => {
      const { data, error } = await (supabase as any)
        .from('marketing_niche_efforts')
        .insert([effort])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing_niche_efforts'] });
      toast({
        title: 'Success',
        description: 'Marketing effort created successfully',
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

  const updateEffort = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MarketingEffort> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('marketing_niche_efforts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing_niche_efforts'] });
      toast({
        title: 'Success',
        description: 'Marketing effort updated successfully',
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

  const deleteEffort = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('marketing_niche_efforts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing_niche_efforts'] });
      toast({
        title: 'Success',
        description: 'Marketing effort deleted successfully',
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
    efforts: efforts || [],
    isLoading,
    error,
    createEffort,
    updateEffort,
    deleteEffort,
  };
};

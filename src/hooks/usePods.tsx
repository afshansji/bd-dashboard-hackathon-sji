import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Pod {
  id: string;
  name: string;
  description?: string;
  lead_user_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const usePods = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pods, isLoading, error } = useQuery({
    queryKey: ['pods'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('pods')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Pod[];
    },
  });

  const createPod = useMutation({
    mutationFn: async (pod: Partial<Pod>) => {
      const { data, error } = await (supabase as any)
        .from('pods')
        .insert([pod])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pods'] });
      toast({
        title: 'Success',
        description: 'POD created successfully',
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

  const updatePod = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Pod> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('pods')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pods'] });
      toast({
        title: 'Success',
        description: 'POD updated successfully',
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

  const deletePod = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('pods')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pods'] });
      toast({
        title: 'Success',
        description: 'POD deleted successfully',
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

  const importPodsFromControlTower = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        'sync-control-tower-pods',
        { body: {} }
      );
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pods'] });
      toast({
        title: 'PODs Imported Successfully',
        description: `Imported ${data.podsImported} PODs from Control Tower`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    pods: pods || [],
    isLoading,
    error,
    createPod,
    updatePod,
    deletePod,
    importPodsFromControlTower,
  };
};

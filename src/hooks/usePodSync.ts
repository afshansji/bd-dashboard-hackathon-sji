import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PodSyncResult {
  success: boolean;
  podsImported: number;
  podNames: string[];
  message: string;
}

export const usePodSync = () => {
  const syncPods = useMutation({
    mutationFn: async (): Promise<PodSyncResult> => {
      const { data, error } = await supabase.functions.invoke('sync-control-tower-pods');

      if (error) {
        throw new Error(error.message || 'Failed to sync PODs');
      }

      return data as PodSyncResult;
    },
    onSuccess: (result) => {
      toast.success('POD sync completed', {
        description: result.message,
      });
    },
    onError: (error: Error) => {
      toast.error('POD sync failed', {
        description: error.message,
      });
    },
  });

  return {
    syncPods: syncPods.mutateAsync,
    isSyncing: syncPods.isPending,
  };
};

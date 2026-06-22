import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface HubSpotSyncResult {
  companies: number;
  contacts: number;
  deals: number;
  pipelineValue: number;
  lastSync: string;
  duration?: number;
}

export const useSyncHubSpot = () => {
  const queryClient = useQueryClient();

  const syncHubSpot = useMutation({
    mutationFn: async (): Promise<HubSpotSyncResult> => {
      const startTime = Date.now();
      
      const { data, error } = await supabase.functions.invoke('hubspot-sync', {
        method: 'POST',
      });

      if (error) {
        throw new Error(error.message || 'Failed to sync from HubSpot');
      }

      if (!data?.ok) {
        throw new Error('HubSpot sync failed');
      }

      const duration = Date.now() - startTime;

      return {
        companies: data.companies || 0,
        contacts: data.contacts || 0,
        deals: data.deals || 0,
        pipelineValue: data.pipelineValue || 0,
        lastSync: data.lastSync || new Date().toISOString(),
        duration,
      };
    },
    onSuccess: async (result) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      
      const summary = [
        `✅ Companies: ${result.companies} synced`,
        `👥 Contacts: ${result.contacts} synced`,
        `💼 Deals: ${result.deals} synced`,
        `⏱️ Completed in ${((result.duration || 0) / 1000).toFixed(1)}s`
      ];
      
      toast.success('HubSpot sync completed successfully', {
        description: summary.join('\n')
      });
    },
    onError: (error: Error) => {
      if (error.message.includes('not configured') || error.message.includes('No active HubSpot')) {
        toast.error('HubSpot Not Configured', {
          description: 'Please configure HubSpot integration in Admin → Integration Manager first.',
          duration: 8000,
        });
      } else {
        toast.error('Sync failed', {
          description: error.message || 'Failed to sync from HubSpot. Please try again.'
        });
      }
    }
  });

  return {
    syncHubSpot: syncHubSpot.mutateAsync,
    isSyncing: syncHubSpot.isPending
  };
};

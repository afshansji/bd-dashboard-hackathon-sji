import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SyncResult {
  deals: {
    new: number;
    updated: number;
    failed: number;
  };
  clients: {
    new: number;
    updated: number;
  };
  checklists: {
    synced: number;
    failed: number;
  };
  errors: string[];
  duration: number;
}

export const useSyncControlTowerDeals = (dealId?: string) => {
  const queryClient = useQueryClient();

  const syncDeals = useMutation({
    mutationFn: async (): Promise<SyncResult> => {
      const { data, error } = await supabase.functions.invoke('sync-control-tower-deals', {
        body: dealId ? { dealId } : undefined,
      });

      if (error) {
        throw new Error(error.message || 'Failed to sync deals');
      }

      return data as SyncResult;
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['control-tower-last-sync'] });
      
      if (dealId) {
        // Invalidate all deal-related queries
        queryClient.invalidateQueries({ queryKey: ['deal-checklist', dealId] });
        queryClient.invalidateQueries({ queryKey: ['deal-comments', dealId] });
        queryClient.invalidateQueries({ queryKey: ['deal-files', dealId] });
        
        // Invalidate the deal detail query to refresh last_synced_at
        // We need to find the deal's slug from cache or fetch it
        const dealsCache = queryClient.getQueryData(['deals']) as any;
        if (dealsCache) {
          const deal = Array.isArray(dealsCache) 
            ? dealsCache.find((d: any) => d.id === dealId)
            : null;
          if (deal?.slug) {
            queryClient.invalidateQueries({ queryKey: ['deal', deal.slug] });
          }
        }
      }
      
      const summary = dealId
        ? [
            `✅ Deal synced successfully`,
            `📋 Checklists: ${result.checklists.synced} items synced`,
            `⏱️ Completed in ${(result.duration / 1000).toFixed(1)}s`
          ]
        : [
            `✅ Deals: ${result.deals.new} new, ${result.deals.updated} updated`,
            `👥 Clients: ${result.clients.new} new, ${result.clients.updated} updated`,
            `📋 Checklists: ${result.checklists.synced} items synced`,
            `⏱️ Completed in ${(result.duration / 1000).toFixed(1)}s`
          ];
      
      const totalFailed = result.deals.failed + result.checklists.failed;
      
      if (totalFailed > 0) {
        summary.push(`⚠️ Failed: ${totalFailed} items`);
        toast.warning('Sync completed with issues', {
          description: summary.join('\n')
        });
      } else {
        toast.success(dealId ? 'Deal synced successfully' : 'Pull sync completed successfully', {
          description: summary.join('\n')
        });
      }
    },
    onError: (error: Error) => {
      toast.error('Sync failed', {
        description: error.message
      });
    }
  });

  return {
    syncDeals: syncDeals.mutateAsync,
    isSyncing: syncDeals.isPending
  };
};

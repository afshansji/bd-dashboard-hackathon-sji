import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FullSyncResult {
  employees: { new: number; updated: number; failed: number };
  pods: { new: number; updated: number; failed: number };
  deals: { new: number; updated: number; failed: number };
  clients: { new: number; updated: number };
  checklists: { synced: number; failed: number };
  warnings: string[];
  errors: string[];
  duration: number;
  mappingStats: {
    unmappedOwners: number;
    unmappedPMs: number;
    unmappedPods: number;
  };
}

export const useSyncControlTowerFull = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<FullSyncResult> => {
      const { data, error } = await supabase.functions.invoke('sync-control-tower-full');

      if (error) {
        throw new Error(error.message || 'Failed to perform full sync');
      }

      return data as FullSyncResult;
    },
    onSuccess: (result) => {
      // Invalidate all relevant caches
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['pods'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['sync-logs'] });
      queryClient.invalidateQueries({ queryKey: ['sync-health'] });
      
      // Build comprehensive toast message
      const summary = [
        `👤 Employees: ${result.employees.new} new, ${result.employees.updated} updated`,
        `📦 PODs: ${result.pods.new} new, ${result.pods.updated} updated`,
        `💼 Deals: ${result.deals.new} new, ${result.deals.updated} updated`,
        `🏢 Clients: ${result.clients.new} new, ${result.clients.updated} updated`,
        `📋 Checklists: ${result.checklists.synced} items synced`,
        `⏱️ Completed in ${(result.duration / 1000).toFixed(1)}s`
      ];
      
      if (result.warnings.length > 0) {
        summary.push('', '⚠️ Warnings:');
        result.warnings.forEach(warning => summary.push(`• ${warning}`));
      }
      
      const hasFailures = 
        result.employees.failed > 0 || 
        result.pods.failed > 0 || 
        result.deals.failed > 0 || 
        result.checklists.failed > 0 ||
        result.errors.length > 0;
      
      if (hasFailures) {
        toast.warning('Full sync completed with issues', {
          description: summary.join('\n'),
          duration: 6000,
        });
      } else if (result.warnings.length > 0) {
        toast.warning('Full sync completed with warnings', {
          description: summary.join('\n'),
          duration: 5000,
        });
      } else {
        toast.success('✅ Full Sync Complete', {
          description: summary.join('\n'),
          duration: 5000,
        });
      }
    },
    onError: (error: Error) => {
      toast.error('Full sync failed', {
        description: error.message,
      });
    }
  });
};

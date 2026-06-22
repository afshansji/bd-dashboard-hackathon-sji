import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EmployeeSyncResult {
  employees: {
    new: number;
    updated: number;
    failed: number;
  };
  errors: string[];
  duration: number;
}

export const useSyncControlTowerEmployees = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<EmployeeSyncResult> => {
      const { data, error } = await supabase.functions.invoke('sync-control-tower-employees');

      if (error) {
        throw new Error(error.message || 'Failed to sync employees');
      }

      return data as EmployeeSyncResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      
      const summary = [
        `✅ Employees: ${result.employees.new} new, ${result.employees.updated} updated`,
        `⏱️ Completed in ${(result.duration / 1000).toFixed(1)}s`
      ];
      
      if (result.employees.failed > 0) {
        summary.push(`⚠️ Failed: ${result.employees.failed} employees`);
        toast.warning('Employee sync completed with issues', {
          description: summary.join('\n')
        });
      } else {
        toast.success('Employees synced successfully', {
          description: summary.join('\n')
        });
      }
    },
    onError: (error: Error) => {
      toast.error('Employee sync failed', {
        description: error.message
      });
    }
  });
};

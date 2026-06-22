import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ControlTowerStatusResult {
  isConfigured: boolean;
  isActive: boolean;
  lastSync: Date | null;
}

export const useControlTowerStatus = () => {
  const query = useQuery({
    queryKey: ['control-tower-status'],
    queryFn: async (): Promise<ControlTowerStatusResult> => {
      // Check if Control Tower is configured via ai_configurations
      const { data: configData, error: configError } = await supabase
        .from('ai_configurations')
        .select('configuration_data, user_id')
        .eq('configuration_type', 'control_tower')
        .maybeSingle();

      if (configError && configError.code !== 'PGRST116') {
        console.error('Failed to check Control Tower config:', configError);
      }

      // Check if config exists and has required fields
      const config = configData?.configuration_data as any;
      const hasUrl = !!config?.url;
      const hasKey = !!config?.anon_key;
      const isActive = config?.is_active ?? true;
      const isConfigured = hasUrl && hasKey;

      // Get last sync time from control_tower_sync_log
      const { data: syncLog } = await supabase
        .from('control_tower_sync_log')
        .select('synced_at')
        .eq('status', 'success')
        .order('synced_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        isConfigured,
        isActive: isConfigured && isActive,
        lastSync: syncLog?.synced_at ? new Date(syncLog.synced_at) : null,
      };
    },
    refetchInterval: 60000, // Refresh every 60 seconds
    retry: 1,
  });

  return {
    isConfigured: query.data?.isConfigured ?? false,
    isActive: query.data?.isActive ?? false,
    lastSync: query.data?.lastSync ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
};

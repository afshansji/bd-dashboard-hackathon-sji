import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HubSpotStatusResult {
  isConfigured: boolean;
  isActive: boolean;
  lastSync: Date | null;
}

export const useHubSpotStatus = () => {
  const query = useQuery({
    queryKey: ['hubspot-status'],
    queryFn: async (): Promise<HubSpotStatusResult> => {
      const { data, error } = await supabase.functions.invoke('hubspot-sync/status', {
        method: 'GET',
      });

      if (error) {
        console.error('Failed to check HubSpot status:', error);
        return {
          isConfigured: false,
          isActive: false,
          lastSync: null,
        };
      }

      return {
        isConfigured: data?.ok || false,
        isActive: data?.isActive || false,
        lastSync: data?.lastSync ? new Date(data.lastSync) : null,
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

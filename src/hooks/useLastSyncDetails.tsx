import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LastSyncDetails {
  id: string;
  status: 'success' | 'failed' | 'pending';
  synced_at: string;
  sync_type: string;
  entity_type: string;
  error_message?: string;
  payload: {
    deals?: {
      new: number;
      updated: number;
      failed: number;
    };
    clients?: {
      new: number;
      updated: number;
    };
    checklists?: {
      synced: number;
      failed: number;
    };
    duration: number;
    timestamp?: string;
    errors?: string[];
  };
}

export const useLastSyncDetails = () => {
  return useQuery({
    queryKey: ['control-tower-last-sync'],
    queryFn: async (): Promise<LastSyncDetails | null> => {
      const { data, error } = await supabase
        .from('control_tower_sync_log')
        .select('*')
        .eq('sync_type', 'pull')
        .eq('entity_type', 'deal')
        .order('synced_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('Failed to fetch last sync details:', error);
        throw error;
      }
      
      if (!data) return null;

      // Parse the payload from Json to our expected structure
      const payload = typeof data.payload === 'object' && data.payload !== null 
        ? data.payload as any
        : { duration: 0 };
      
      return {
        ...data,
        payload: {
          deals: payload.deals || { new: 0, updated: 0, failed: 0 },
          clients: payload.clients || { new: 0, updated: 0 },
          checklists: payload.checklists || { synced: 0, failed: 0 },
          duration: payload.duration || 0,
          timestamp: payload.timestamp,
          errors: payload.errors || []
        }
      } as LastSyncDetails;
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    retry: 1,
  });
};

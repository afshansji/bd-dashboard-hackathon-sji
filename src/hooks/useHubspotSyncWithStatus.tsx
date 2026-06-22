import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface HubspotSyncStatus {
  id: string;
  sync_type: 'full' | 'deals-only';
  status: 'in_progress' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  total_items_synced?: number;
  companies_synced?: number;
  contacts_synced?: number;
  deals_synced?: number;
  error_message?: string;
  triggered_by?: string;
}

export const useHubspotSyncWithStatus = (onSyncComplete?: () => void) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentSyncId, setCurrentSyncId] = useState<string | null>(null);
  const [currentSync, setCurrentSync] = useState<HubspotSyncStatus | null>(null);
  const [lastSync, setLastSync] = useState<HubspotSyncStatus | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check for existing sync on mount
  useEffect(() => {
    const checkExistingSync = async () => {
      try {
        // Check for in-progress sync
        const { data: inProgressData } = await supabase
          .from('hubspot_sync_status')
          .select('*')
          .eq('status', 'in_progress')
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (inProgressData) {
          setCurrentSyncId(inProgressData.id);
          setCurrentSync(inProgressData as HubspotSyncStatus);
          setIsSyncing(true);
        }

        // Fetch last completed or failed sync
        const { data: lastSyncData } = await supabase
          .from('hubspot_sync_status')
          .select('*')
          .in('status', ['completed', 'failed'])
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastSyncData) {
          setLastSync(lastSyncData as HubspotSyncStatus);
        }
      } catch (error) {
        console.log('No HubSpot sync found');
      }
    };

    checkExistingSync();
  }, []);

  // Auto-recovery for stuck syncs (older than 20 minutes)
  useEffect(() => {
    const checkStuckSyncs = async () => {
      try {
        const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();

        const { data: stuckSync } = await supabase
          .from('hubspot_sync_status')
          .select('*')
          .eq('status', 'in_progress')
          .lt('started_at', twentyMinutesAgo)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (stuckSync) {
          console.log('Found stuck sync, recovering:', stuckSync.id);

          // Check if deals were actually synced
          const { count } = await supabase
            .from('deals')
            .select('*', { count: 'exact', head: true });

          // Update the stuck sync to "completed"
          await supabase
            .from('hubspot_sync_status')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              total_items_synced: count || 0,
              error_message: 'Auto-recovered from timeout'
            })
            .eq('id', stuckSync.id);

          if (currentSyncId === stuckSync.id) {
            setIsSyncing(false);
            setCurrentSync(null);
            setLastSync({
              ...stuckSync,
              sync_type: (stuckSync.sync_type as 'full' | 'deals-only'),
              status: 'completed',
              completed_at: new Date().toISOString(),
              total_items_synced: count || 0,
            });
            setCurrentSyncId(null);

            if (onSyncComplete) {
              onSyncComplete();
            }
          }
        }
      } catch (error) {
        console.error('Error checking for stuck syncs:', error);
      }
    };

    checkStuckSyncs();
    const recoveryInterval = setInterval(checkStuckSyncs, 60000); // Check every minute
    return () => clearInterval(recoveryInterval);
  }, [currentSyncId, onSyncComplete]);

  // Poll for sync status updates
  useEffect(() => {
    if (!currentSyncId || !isSyncing) return;

    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('hubspot_sync_status')
          .select('*')
          .eq('id', currentSyncId)
          .single();

        if (error) throw error;

        const syncData = data as HubspotSyncStatus;

        if (syncData.status === 'completed') {
          setIsSyncing(false);
          setCurrentSync(null);
          setLastSync(syncData);

          // Invalidate queries based on sync type
          if (syncData.sync_type === 'full') {
            queryClient.invalidateQueries({ queryKey: ['deals'] });
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
          } else if (syncData.sync_type === 'deals-only') {
            queryClient.invalidateQueries({ queryKey: ['deals'] });
          }

          const summary = [];
          if (syncData.companies_synced && syncData.companies_synced > 0) {
            summary.push(`Companies: ${syncData.companies_synced}`);
          }
          if (syncData.contacts_synced && syncData.contacts_synced > 0) {
            summary.push(`Contacts: ${syncData.contacts_synced}`);
          }
          if (syncData.deals_synced && syncData.deals_synced > 0) {
            summary.push(`Deals: ${syncData.deals_synced}`);
          }

          toast({
            title: "Sync Complete",
            description: summary.length > 0 
              ? `Successfully synced: ${summary.join(', ')}`
              : `Successfully synced ${syncData.total_items_synced || 0} items from HubSpot.`,
          });

          if (onSyncComplete) {
            onSyncComplete();
          }

          setCurrentSyncId(null);
          clearInterval(pollInterval);
        } else if (syncData.status === 'failed') {
          setIsSyncing(false);
          setCurrentSync(null);
          setLastSync(syncData);

          toast({
            title: "Sync Failed",
            description: syncData.error_message || "HubSpot sync failed. Please try again.",
            variant: "destructive",
          });

          setCurrentSyncId(null);
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Error polling sync status:', error);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [currentSyncId, isSyncing, onSyncComplete, toast, queryClient]);

  const startSync = useCallback(async (syncType: 'full' | 'deals-only' = 'full') => {
    try {
      setIsSyncing(true);

      const { data, error } = await supabase.functions.invoke('hubspot-sync', {
        method: 'POST',
        body: { syncType }
      });

      if (error) {
        throw error;
      }

      if (data?.syncId) {
        setCurrentSyncId(data.syncId);
        toast({
          title: "Sync Started",
          description: `HubSpot ${syncType === 'deals-only' ? 'deals-only' : 'full'} sync has been initiated in the background.`,
        });
      } else {
        throw new Error('No sync ID returned from server');
      }
    } catch (error) {
      setIsSyncing(false);

      toast({
        title: "Sync Error",
        description: error instanceof Error ? error.message : "Failed to start HubSpot sync.",
        variant: "destructive",
      });
    }
  }, [toast]);

  return {
    isSyncing,
    currentSync,
    lastSync,
    startSync,
  };
};

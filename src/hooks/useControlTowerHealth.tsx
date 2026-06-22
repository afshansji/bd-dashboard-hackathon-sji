import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface HealthSnapshot {
  id: string;
  snapshot_at: string;
  overall_health_score: number;
  sync_success_rate_24h: number;
  sync_success_rate_7d: number;
  avg_sync_duration_ms: number;
  failed_syncs_count_24h: number;
  pending_push_items: number;
  data_drift_score: number;
  api_response_time_ms: number;
  last_successful_pull: string | null;
  last_successful_push: string | null;
  unmapped_owners_count: number;
  unmapped_pms_count: number;
  unmapped_pods_count: number;
  stale_deals_count: number;
  metrics_detail: any;
  created_at: string;
}

export interface Alert {
  id: string;
  alert_type: 'sync_failure' | 'high_latency' | 'data_drift' | 'mapping_issue' | 'stale_data' | 'api_unreachable';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: string;
  metadata: any;
  status: 'active' | 'acknowledged' | 'resolved' | 'ignored';
  acknowledged_at?: string;
  acknowledged_by?: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  triggered_at: string;
  created_at: string;
}

export const useControlTowerHealth = () => {
  const queryClient = useQueryClient();

  // Fetch latest health snapshot
  const { data: latestHealth, isLoading: isLoadingHealth, error: healthError } = useQuery({
    queryKey: ['control-tower-health-latest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('control_tower_health_snapshots')
        .select('*')
        .order('snapshot_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data as HealthSnapshot;
    },
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch health history (last 7 days, hourly snapshots)
  const { data: healthHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['control-tower-health-history'],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('control_tower_health_snapshots')
        .select('*')
        .gte('snapshot_at', sevenDaysAgo.toISOString())
        .order('snapshot_at', { ascending: false })
        .limit(168); // 7 days * 24 hours

      if (error) throw error;
      return (data || []) as HealthSnapshot[];
    },
  });

  // Fetch active alerts
  const { data: activeAlerts, isLoading: isLoadingAlerts } = useQuery({
    queryKey: ['control-tower-alerts-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('control_tower_alerts')
        .select('*')
        .eq('status', 'active')
        .order('severity', { ascending: false })
        .order('triggered_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Alert[];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Real-time subscription for new alerts
  useEffect(() => {
    const channel = supabase
      .channel('control-tower-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'control_tower_alerts',
        },
        (payload) => {
          console.log('New alert received:', payload);
          queryClient.invalidateQueries({ queryKey: ['control-tower-alerts-active'] });
          
          const newAlert = payload.new as Alert;
          if (newAlert.severity === 'critical' || newAlert.severity === 'error') {
            toast.error(newAlert.title, {
              description: newAlert.message,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Trigger manual health check
  const triggerHealthCheck = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('monitor-control-tower-health');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control-tower-health-latest'] });
      queryClient.invalidateQueries({ queryKey: ['control-tower-health-history'] });
      queryClient.invalidateQueries({ queryKey: ['control-tower-alerts-active'] });
      toast.success('Health check completed');
    },
    onError: (error: Error) => {
      toast.error('Health check failed', {
        description: error.message,
      });
    },
  });

  // Acknowledge alert
  const acknowledgeAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('control_tower_alerts')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user.id,
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control-tower-alerts-active'] });
      toast.success('Alert acknowledged');
    },
    onError: (error: Error) => {
      toast.error('Failed to acknowledge alert', {
        description: error.message,
      });
    },
  });

  // Resolve alert
  const resolveAlert = useMutation({
    mutationFn: async ({ alertId, notes }: { alertId: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('control_tower_alerts')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
          resolution_notes: notes,
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control-tower-alerts-active'] });
      toast.success('Alert resolved');
    },
    onError: (error: Error) => {
      toast.error('Failed to resolve alert', {
        description: error.message,
      });
    },
  });

  return {
    latestHealth: latestHealth || null,
    healthHistory: healthHistory || [],
    activeAlerts: activeAlerts || [],
    isLoading: isLoadingHealth || isLoadingHistory || isLoadingAlerts,
    error: healthError,
    refreshHealth: () => {
      queryClient.invalidateQueries({ queryKey: ['control-tower-health-latest'] });
      queryClient.invalidateQueries({ queryKey: ['control-tower-health-history'] });
    },
    triggerHealthCheck: triggerHealthCheck.mutateAsync,
    isCheckingHealth: triggerHealthCheck.isPending,
    acknowledgeAlert: acknowledgeAlert.mutateAsync,
    resolveAlert: resolveAlert.mutateAsync,
  };
};

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { Loader2, RefreshCw, CloudUpload, CloudDownload, AlertCircle, CheckCircle2, Clock, Trash2, Network, Activity, Settings, History, Calendar, Users, Package, Building2, Briefcase, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { useSyncControlTowerFull } from '@/hooks/useSyncControlTowerFull';
import { useSyncControlTowerDeals } from '@/hooks/useSyncControlTowerDeals';
import { useSyncControlTowerEmployees } from '@/hooks/useSyncControlTowerEmployees';
import { usePodSync } from '@/hooks/usePodSync';
import { usePushToControlTower } from '@/hooks/usePushToControlTower';
import { useControlTowerHealth } from '@/hooks/useControlTowerHealth';
import { useSyncControlTowerClientsAPI } from '@/hooks/useControlTowerData';
import { HealthOverviewCard } from '@/components/admin/HealthOverviewCard';
import { ActiveAlertsPanel } from '@/components/admin/ActiveAlertsPanel';
import { DataFreshnessBadge } from '@/components/admin/DataFreshnessBadge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SyncLog {
  id: string;
  sync_type: 'pull' | 'push';
  entity_type: string;
  status: string;
  error_message: string | null;
  payload: Record<string, unknown> | null;
  synced_at: string | null;
  synced_by: string | null;
  entity_id: string | null;
  control_tower_id: string | null;
  synced_by_user?: {
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
}

interface SyncConfig {
  auto_pull_enabled: boolean;
  auto_push_enabled: boolean;
  pull_schedule: 'hourly' | 'daily';
  push_schedule: 'hourly' | 'daily';
  retry_failed?: boolean;
  email_on_failure?: boolean;
}

interface EmailRecipient {
  id: string;
  email: string;
  full_name?: string;
}

interface DealCounts {
  prospecting: number;
  qualification: number;
  proposal: number;
  negotiation: number;
}

const defaultConfig: SyncConfig = {
  auto_pull_enabled: true,
  auto_push_enabled: true,
  pull_schedule: 'hourly',
  push_schedule: 'hourly',
};

const DataSyncCenter = () => {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingComments, setPendingComments] = useState(0);
  const [pendingChecklist, setPendingChecklist] = useState(0);
  const [dealCounts, setDealCounts] = useState<DealCounts>({ prospecting: 0, qualification: 0, proposal: 0, negotiation: 0 });
  const [config, setConfig] = useState<SyncConfig>(defaultConfig);
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isSyncingPods, setIsSyncingPods] = useState(false);
  const [isClearingLogs, setIsClearingLogs] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [filters, setFilters] = useState({ entityType: 'all', status: 'all' });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshCountdown, setRefreshCountdown] = useState(30);
  const [syncHealth, setSyncHealth] = useState<any>(null);
  const [entityCounts, setEntityCounts] = useState({ employees: 0, pods: 0, clients: 0, deals: 0 });
  const [lastFullSync, setLastFullSync] = useState<any>(null);
  const [showSyncDetails, setShowSyncDetails] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState<EmailRecipient[]>([]);
  const [availableUsers, setAvailableUsers] = useState<EmailRecipient[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [recipientLoading, setRecipientLoading] = useState(false);
  const [recipientSaving, setRecipientSaving] = useState(false);
  
  const { mutate: triggerFullSync, isPending: isFullSyncing } = useSyncControlTowerFull();
  const { syncDeals, isSyncing: isSyncingDeals } = useSyncControlTowerDeals();
  const { mutate: triggerEmployeeSync, isPending: isSyncingEmployees } = useSyncControlTowerEmployees();
  const { syncPods } = usePodSync();
  const { pushDeal } = usePushToControlTower();
  const { mutate: triggerClientsAPISync, isPending: isSyncingClientsAPI } = useSyncControlTowerClientsAPI();
  
  // Health monitoring
  const {
    latestHealth,
    activeAlerts,
    isLoading: isLoadingHealth,
    triggerHealthCheck,
    isCheckingHealth,
    acknowledgeAlert: acknowledgeAlertMutation,
    resolveAlert: resolveAlertMutation,
  } = useControlTowerHealth();

  useEffect(() => {
    fetchSummary();
    fetchConfig();
    fetchSyncHealth();
    fetchEntityCounts();
    fetchEmailRecipients();
  }, []);

  // Auto-refresh timer
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          fetchSummary();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchSyncHealth = async () => {
    try {
      const { data, error } = await supabase.rpc('get_sync_health_summary');
      if (!error && data) {
        setSyncHealth(data);
      }
    } catch (error) {
      console.error('Failed to fetch sync health', error);
    }
  };

  const fetchEntityCounts = async () => {
    try {
      const [empResult, podResult, clientResult, dealResult] = await Promise.all([
        supabase.from('employees').select('id', { count: 'exact', head: true }).eq('synced_from_control_tower', true),
        supabase.from('pods').select('id', { count: 'exact', head: true }),
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('deals').select('id', { count: 'exact', head: true }).eq('synced_from_control_tower', true),
      ]);
      
      setEntityCounts({
        employees: empResult.count ?? 0,
        pods: podResult.count ?? 0,
        clients: clientResult.count ?? 0,
        deals: dealResult.count ?? 0,
      });
    } catch (error) {
      console.error('Failed to fetch entity counts', error);
    }
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      // Fetch sync logs with user information
      const logQuery: any = supabase
        .from('control_tower_sync_log' as any)
        .select(`
          *,
          synced_by_user:synced_by(email, first_name, last_name)
        `)
        .order('synced_at', { ascending: false })
        .limit(100);
      
      const logResult = await logQuery;
      
      if (logResult.error) throw logResult.error;
      
      const mappedLogs: SyncLog[] = (logResult.data || []).map((log: any) => ({
        id: log.id,
        sync_type: log.sync_type as 'pull' | 'push',
        entity_type: log.entity_type,
        status: log.status,
        error_message: log.error_message || null,
        payload: log.payload || null,
        synced_at: log.synced_at,
        synced_by: log.synced_by || null,
        entity_id: log.entity_id || null,
        control_tower_id: log.control_tower_id || null,
        synced_by_user: log.synced_by_user || undefined,
      }));
      
      setLogs(mappedLogs);
      
      // Find last full sync
      const fullSync = mappedLogs.find(log => log.entity_type === 'full_sync');
      setLastFullSync(fullSync);

      // Fetch pending comments count
      const commentQuery: any = supabase
        .from('deal_comments' as any)
        .select('id', { count: 'exact', head: true })
        .eq('synced_to_control_tower', false);
      
      const commentResult = await commentQuery;
      
      if (commentResult.error) throw commentResult.error;
      setPendingComments(commentResult.count ?? 0);

      // Fetch pending checklist items count
      const checklistQuery: any = supabase
        .from('deal_checklist_items' as any)
        .select('id', { count: 'exact', head: true })
        .eq('is_completed', true)
        .eq('synced_to_control_tower', false);
      
      const checklistResult = await checklistQuery;
      
      if (checklistResult.error) throw checklistResult.error;
      setPendingChecklist(checklistResult.count ?? 0);

      // Fetch deal counts by stage
      const dealsQuery: any = supabase
        .from('deals' as any)
        .select('stage');
      
      const dealsResult = await dealsQuery;
      
      if (!dealsResult.error && dealsResult.data) {
        const counts: DealCounts = {
          prospecting: dealsResult.data.filter((d: any) => d.stage === 'prospecting').length,
          qualification: dealsResult.data.filter((d: any) => d.stage === 'qualification').length,
          proposal: dealsResult.data.filter((d: any) => d.stage === 'proposal').length,
          negotiation: dealsResult.data.filter((d: any) => d.stage === 'negotiation').length,
        };
        setDealCounts(counts);
      }
      
      await fetchSyncHealth();
      await fetchEntityCounts();
    } catch (error) {
      console.error('Failed to load sync dashboard', error);
      toast({ title: 'Error', description: 'Unable to load sync information.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    setConfigLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('ai_configurations')
        .select('configuration_data')
        .eq('user_id', user.id)
        .eq('configuration_type', 'control_tower_sync')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.configuration_data && typeof data.configuration_data === 'object') {
        const configData = data.configuration_data as Record<string, any>;
        setConfig({ 
          ...defaultConfig, 
          auto_pull_enabled: configData.auto_pull_enabled ?? defaultConfig.auto_pull_enabled,
          auto_push_enabled: configData.auto_push_enabled ?? defaultConfig.auto_push_enabled,
          pull_schedule: configData.pull_schedule ?? defaultConfig.pull_schedule,
          push_schedule: configData.push_schedule ?? defaultConfig.push_schedule,
          retry_failed: configData.retry_failed ?? defaultConfig.retry_failed,
          email_on_failure: configData.email_on_failure ?? defaultConfig.email_on_failure,
        });
      } else {
        setConfig(defaultConfig);
      }
    } catch (error) {
      console.error('Failed to load sync config', error);
      toast({ title: 'Error', description: 'Could not load Control Tower sync settings.', variant: 'destructive' });
    } finally {
      setConfigLoading(false);
    }
  };

  const saveConfig = async () => {
    setConfigSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('ai_configurations')
        .upsert([{
          user_id: user.id,
          configuration_type: 'control_tower_sync',
          configuration_data: config as any,
        }]);

      if (error) throw error;
      toast({ title: 'Settings saved', description: 'Control Tower sync configuration updated.' });
    } catch (error) {
      console.error('Failed to save config', error);
      toast({ title: 'Error', description: 'Could not save Control Tower sync settings.', variant: 'destructive' });
    } finally {
      setConfigSaving(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('full_name', { ascending: true });

      if (error) throw error;

      if (data) {
        const usersWithRoles = await Promise.all(
          (data as any[]).map(async (user) => {
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', user.id)
              .in('role', ['super_admin', 'admin']);

            if (roleData && roleData.length > 0) {
              return { id: user.id, email: user.email, full_name: user.full_name };
            }
            return null;
          })
        );

        const admins = usersWithRoles.filter((u) => u !== null) as EmailRecipient[];
        setAvailableUsers(admins);
      }
    } catch (error) {
      console.error('Failed to fetch available users', error);
      toast({ title: 'Error', description: 'Could not load available users.', variant: 'destructive' });
    }
  };

  const fetchEmailRecipients = async () => {
    setRecipientLoading(true);
    try {
      const { data, error } = await supabase
        .from('control_tower_alert_config')
        .select('notification_recipients')
        .eq('alert_type', 'sync_failure')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.notification_recipients && Array.isArray(data.notification_recipients)) {
        const recipients = (data.notification_recipients as any[]).map((r: any) => ({
          id: r.id || '',
          email: r.email || '',
          full_name: r.full_name || undefined
        }));
        setEmailRecipients(recipients);
      } else {
        setEmailRecipients([]);
      }

      await fetchAvailableUsers();
    } catch (error) {
      console.error('Failed to fetch email recipients', error);
      toast({ title: 'Error', description: 'Could not load email recipients.', variant: 'destructive' });
    } finally {
      setRecipientLoading(false);
    }
  };

  const saveEmailRecipients = async (recipients: EmailRecipient[]) => {
    setRecipientSaving(true);
    try {
      const recipientsJson = recipients.map(r => ({ id: r.id, email: r.email, full_name: r.full_name }));
      const { error } = await supabase
        .from('control_tower_alert_config')
        .update({ notification_recipients: recipientsJson as any, updated_at: new Date().toISOString() })
        .eq('alert_type', 'sync_failure');

      if (error) throw error;
      setEmailRecipients(recipients);
      toast({ title: 'Recipients saved', description: 'Email recipients updated successfully.' });
    } catch (error) {
      console.error('Failed to save email recipients', error);
      toast({ title: 'Error', description: 'Could not save email recipients.', variant: 'destructive' });
    } finally {
      setRecipientSaving(false);
    }
  };

  const addEmailRecipient = async () => {
    if (!selectedUser) {
      toast({ title: 'Error', description: 'Please select a user.', variant: 'destructive' });
      return;
    }

    const user = availableUsers.find((u) => u.id === selectedUser);
    if (!user) {
      toast({ title: 'Error', description: 'Selected user not found.', variant: 'destructive' });
      return;
    }

    const existingUser = emailRecipients.find((r) => r.id === user.id);
    if (existingUser) {
      toast({ title: 'Error', description: 'This user is already in the recipients list.', variant: 'destructive' });
      return;
    }

    const updatedRecipients = [...emailRecipients, user];
    await saveEmailRecipients(updatedRecipients);
    setSelectedUser('');
  };

  const deleteEmailRecipient = async (userId: string) => {
    const updatedRecipients = emailRecipients.filter((r) => r.id !== userId);
    await saveEmailRecipients(updatedRecipients);
  };

  const triggerPullSync = async (fullSync: boolean = false) => {
    setIsPulling(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-control-tower-deals', { 
        body: { forceFullSync: fullSync } 
      });
      if (error) throw error;
      
      const summary = [
        `✅ Deals: ${data?.deals?.new || 0} new, ${data?.deals?.updated || 0} updated`,
        `👥 Clients: ${data?.clients?.new || 0} new, ${data?.clients?.updated || 0} updated`,
        `📋 Checklists: ${data?.checklists?.synced || 0} items synced`,
        `⏱️ Completed in ${((data?.duration || 0) / 1000).toFixed(1)}s`
      ];
      
      const totalFailed = (data?.deals?.failed || 0) + (data?.checklists?.failed || 0);
      if (totalFailed > 0) {
        summary.push(`⚠️ Failed: ${totalFailed} items`);
      }
      
      toast({ 
        title: fullSync 
          ? (totalFailed > 0 ? '⚠️ Full Sync Completed with Issues' : '✅ Full Sync Complete')
          : (totalFailed > 0 ? '⚠️ Pull Sync Completed with Issues' : '✅ Pull Sync Complete'),
        description: summary.join('\n'),
        variant: totalFailed > 0 ? 'destructive' : 'default',
        duration: 8000
      });
    } catch (error: any) {
      toast({ title: '❌ Sync Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsPulling(false);
      fetchSummary();
    }
  };

  const triggerPushSync = async () => {
    setIsPushing(true);
    try {
      const { data, error } = await supabase.functions.invoke('push-to-control-tower', {
        body: { entity_type: 'all' },
      });
      if (error) throw error;
      
      const summary = [
        `💬 Comments: ${data?.comments_synced || 0} synced`,
        `☑️ Checklists: ${data?.checklists_synced || 0} synced`,
        `⏱️ Completed in ${(data?.duration / 1000 || 0).toFixed(1)}s`
      ];
      
      if (data?.failed > 0) {
        summary.push(`⚠️ Failed: ${data.failed} items`);
      }
      
      toast({ 
        title: data?.failed > 0 ? '⚠️ Push Sync Completed with Issues' : '✅ Push Sync Complete',
        description: summary.join('\n'),
        variant: data?.failed > 0 ? 'destructive' : 'default',
        duration: 8000
      });
    } catch (error: any) {
      toast({ title: '❌ Sync Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsPushing(false);
      fetchSummary();
    }
  };

  const triggerPodSync = async () => {
    setIsSyncingPods(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-control-tower-pods');
      if (error) throw error;
      
      toast({ 
        title: '✅ POD Sync Complete',
        description: `Imported ${data?.podsImported || 0} PODs from Control Tower`,
        duration: 5000
      });
    } catch (error: any) {
      toast({ title: '❌ POD Sync Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSyncingPods(false);
      fetchSummary();
    }
  };

  const clearAllLogs = async () => {
    setIsClearingLogs(true);
    try {
      const { error } = await supabase.rpc('clear_all_sync_logs');
      if (error) throw error;
      
      setShowClearDialog(false);
      
      toast({ 
        title: '✅ Logs Cleared',
        description: 'All sync logs have been deleted.',
      });
      
      await fetchSummary();
    } catch (error: any) {
      console.error('Clear logs error:', error);
      toast({ 
        title: '❌ Clear Failed', 
        description: error.message || 'Failed to clear logs', 
        variant: 'destructive' 
      });
    } finally {
      setIsClearingLogs(false);
    }
  };

  const lastPull = useMemo(() => logs.find((log) => log.sync_type === 'pull'), [logs]);
  const lastPush = useMemo(() => logs.find((log) => log.sync_type === 'push'), [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const entityMatch = filters.entityType === 'all' || log.entity_type === filters.entityType;
      const statusMatch = filters.status === 'all' || log.status === filters.status;
      return entityMatch && statusMatch;
    });
  }, [logs, filters]);

  const renderStatusBadge = (status: string) => {
    if (status === 'success') {
      return (
        <Badge variant="outline" className="bg-green-600/10 text-green-700">
          <CheckCircle2 className="mr-1 h-3 w-3" /> Success
        </Badge>
      );
    }
    if (status === 'failed') {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" /> Failed
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <Clock className="h-3 w-3" /> {status}
      </Badge>
    );
  };

  const getSyncStatusIndicator = () => {
    if (isPulling || isPushing || isSyncingPods) {
      return <span className="flex h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />;
    }
    if (lastPull?.status === 'failed' || lastPush?.status === 'failed') {
      return <span className="flex h-2 w-2 rounded-full bg-red-500" />;
    }
    if (lastPull || lastPush) {
      return <span className="flex h-2 w-2 rounded-full bg-green-500" />;
    }
    return <span className="flex h-2 w-2 rounded-full bg-gray-400" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getSyncStatusIndicator()}
          <div>
            <h1 className="text-3xl font-bold">Data Sync Center</h1>
            <p className="text-muted-foreground mt-1">
              Keep your BD Portal synchronized with Control Tower CRM
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="auto-refresh"
            checked={autoRefresh}
            onCheckedChange={setAutoRefresh}
          />
          <Label htmlFor="auto-refresh" className="text-sm">
            Auto-refresh {autoRefresh && `(${refreshCountdown}s)`}
          </Label>
        </div>
      </div>

      {/* Instructions Panel */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <CardTitle>How to Get Updated Data</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">📊 Quick Sync Guide</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li><strong>For All Data:</strong> Click "🔄 Full Sync" to update Employees, PODs, Deals, Projects, and Clients in one go</li>
                <li><strong>For Deals Only:</strong> Click "💼 Sync Deals" to pull latest deals and projects from Control Tower</li>
                <li><strong>For Clients Only:</strong> Click "🏢 Sync Clients API" to update client information via the official API</li>
                <li><strong>Push Updates:</strong> Click "📤 Push Changes" to send your comments and checklist updates back to Control Tower</li>
              </ol>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-semibold mb-2">🔍 What Each Sync Does</h4>
              <div className="grid gap-2 text-sm">
                <div className="flex gap-2">
                  <Badge variant="outline">Full Sync</Badge>
                  <span>Employees → PODs → Deals → Projects → Clients → Checklists (in correct dependency order)</span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">Deals Sync</Badge>
                  <span>Active deals + associated projects, checklists, and client info</span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">Clients API</Badge>
                  <span>Client records via official REST API (recommended for client data)</span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">Push Changes</Badge>
                  <span>Sends your comments and completed checklist items to Control Tower</span>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className="bg-muted/50 p-3 rounded-md">
              <p className="text-sm font-medium mb-1">💡 Best Practice</p>
              <p className="text-sm text-muted-foreground">
                Run "Full Sync" once daily. Use "Deals" or "Clients API" for quick updates throughout the day.
                Automatic sync runs every hour, but you can trigger manual sync anytime.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="health" className="gap-2">
            <AlertCircle className="h-4 w-4" />
            Health & Alerts
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <History className="h-4 w-4" />
            Activity Log
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="gap-2">
            <Calendar className="h-4 w-4" />
            Scheduled Jobs
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2">
            <Settings className="h-4 w-4" />
            Configuration
          </TabsTrigger>
        </TabsList>

        {/* Health & Alerts Tab */}
        <TabsContent value="health" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HealthOverviewCard
              latestHealth={latestHealth}
              isLoading={isLoadingHealth}
              onRefresh={triggerHealthCheck}
              isRefreshing={isCheckingHealth}
              activeAlertsCount={activeAlerts.length}
            />
            <ActiveAlertsPanel
              alerts={activeAlerts}
              isLoading={isLoadingHealth}
              onAcknowledge={acknowledgeAlertMutation}
              onResolve={(alertId, notes) => resolveAlertMutation({ alertId, notes })}
            />
          </div>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Last Pull</CardTitle>
                <CardDescription>Inbound sync from Control Tower</CardDescription>
              </CardHeader>
              <CardContent>
                {lastPull?.synced_at ? (
                  <p className="text-sm font-medium">
                    {formatDistanceToNow(new Date(lastPull.synced_at), { addSuffix: true })}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">No pull sync recorded</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Last Push</CardTitle>
                <CardDescription>Outbound updates to Control Tower</CardDescription>
              </CardHeader>
              <CardContent>
                {lastPush?.synced_at ? (
                  <p className="text-sm font-medium">
                    {formatDistanceToNow(new Date(lastPush.synced_at), { addSuffix: true })}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">No push sync recorded</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pending Comments</CardTitle>
                <CardDescription>Unsynced user discussions</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{pendingComments}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pending Checklist Items</CardTitle>
                <CardDescription>Completed items awaiting push</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{pendingChecklist}</p>
              </CardContent>
            </Card>
          </div>

          {/* Entity Count Cards */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Employees Synced
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{entityCounts.employees}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  PODs Synced
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{entityCounts.pods}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Clients
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{entityCounts.clients}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Deals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{entityCounts.deals}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Manual Sync</CardTitle>
              <CardDescription>Trigger immediate synchronization operations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={() => triggerFullSync()} 
                  disabled={isFullSyncing || loading}
                  size="lg"
                  title="Syncs Employees → PODs → Deals → Checklists in correct order"
                >
                  {isFullSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  {isFullSyncing ? 'Syncing...' : '🔄 Full Sync'}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => triggerEmployeeSync()} 
                  disabled={isSyncingEmployees || loading}
                  title="Manual refresh of employee data"
                >
                  {isSyncingEmployees ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                  {isSyncingEmployees ? 'Syncing...' : '👤 Sync Employees Only'}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={triggerPodSync} 
                  disabled={isSyncingPods || loading}
                  title="Manual refresh of POD definitions"
                >
                  {isSyncingPods ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Package className="mr-2 h-4 w-4" />}
                  {isSyncingPods ? 'Syncing...' : '📦 Sync PODs Only'}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => syncDeals()}
                  disabled={isSyncingDeals || loading}
                  title="Syncs deals, clients, and checklists (requires employees & PODs)"
                >
                  {isSyncingDeals ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Briefcase className="mr-2 h-4 w-4" />}
                  {isSyncingDeals ? 'Syncing...' : '💼 Sync Deals Only'}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    triggerClientsAPISync(undefined, {
                      onSuccess: (result) => {
                        toast({
                          title: "Clients Synced via REST API",
                          description: `✅ ${result.clients.new} new, ${result.clients.updated} updated, ${result.clients.skipped} skipped${result.clients.failed > 0 ? `, ⚠️ ${result.clients.failed} failed` : ''}`,
                        });
                        fetchSummary();
                      },
                      onError: (error: any) => {
                        toast({
                          title: "Client Sync Failed",
                          description: error.message,
                          variant: "destructive",
                        });
                      },
                    });
                  }}
                  disabled={isSyncingClientsAPI || loading}
                  title="Sync clients from Control Tower REST API (official API, not direct DB access)"
                >
                  {isSyncingClientsAPI ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Building2 className="mr-2 h-4 w-4" />}
                  {isSyncingClientsAPI ? 'Syncing...' : '🏢 Sync Clients API'}
                </Button>

                <Button
                  variant="outline"
                  onClick={triggerPushSync}
                  disabled={isPushing || loading}
                  title="Push comments and checklist updates to Control Tower"
                >
                  {isPushing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CloudUpload className="mr-2 h-4 w-4" />}
                  {isPushing ? 'Pushing...' : '📤 Push Changes'}
                </Button>
              </div>
              
              {/* Last Full Sync Details */}
              {lastFullSync && (
                <Collapsible open={showSyncDetails} onOpenChange={setShowSyncDetails}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between">
                      <span className="text-sm text-muted-foreground">
                        Last Full Sync: {formatDistanceToNow(new Date(lastFullSync.synced_at), { addSuffix: true })}
                      </span>
                      {showSyncDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <div className="space-y-1 text-sm pl-4 border-l-2 border-primary/20">
                      {lastFullSync.payload?.employees && (
                        <div>👤 Employees: {lastFullSync.payload.employees.new} new, {lastFullSync.payload.employees.updated} updated</div>
                      )}
                      {lastFullSync.payload?.pods && (
                        <div>📦 PODs: {lastFullSync.payload.pods.new} new, {lastFullSync.payload.pods.updated} updated</div>
                      )}
                      {lastFullSync.payload?.deals && (
                        <div>💼 Deals: {lastFullSync.payload.deals.new} new, {lastFullSync.payload.deals.updated} updated</div>
                      )}
                      {lastFullSync.payload?.clients && (
                        <div>🏢 Clients: {lastFullSync.payload.clients.new} new, {lastFullSync.payload.clients.updated} updated</div>
                      )}
                      {lastFullSync.payload?.checklists && (
                        <div>📋 Checklists: {lastFullSync.payload.checklists.synced} items synced</div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </CardContent>
          </Card>

          {/* Sync Health Section */}
          {syncHealth && (
            <Card>
              <CardHeader>
                <CardTitle>🏥 Sync Health</CardTitle>
                <CardDescription>Issues requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                {syncHealth.unmapped_owners === 0 && 
                 syncHealth.unmapped_pms === 0 && 
                 syncHealth.unmapped_pods === 0 && 
                 syncHealth.failed_pushes_7d === 0 ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">All systems operational</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {syncHealth.unmapped_owners > 0 && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm">{syncHealth.unmapped_owners} deals with unmapped owners</span>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => triggerFullSync()}>
                          Fix Now
                        </Button>
                      </div>
                    )}
                    {syncHealth.unmapped_pods > 0 && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm">{syncHealth.unmapped_pods} deals with unmapped PODs</span>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => triggerFullSync()}>
                          Fix Now
                        </Button>
                      </div>
                    )}
                    {syncHealth.failed_pushes_7d > 0 && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-950/20">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <span className="text-sm">{syncHealth.failed_pushes_7d} failed push operations (last 7 days)</span>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => setFilters({ entityType: 'all', status: 'failed' })}>
                          View Details
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Data Coverage</CardTitle>
              <CardDescription>Local database deal counts by pipeline stage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                  <div>Stage</div>
                  <div className="text-right">Deal Count</div>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Prospecting</span>
                    </div>
                    <div className="text-right font-mono font-semibold">{dealCounts.prospecting}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Qualification</span>
                    </div>
                    <div className="text-right font-mono font-semibold">{dealCounts.qualification}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Proposal</span>
                    </div>
                    <div className="text-right font-mono font-semibold">{dealCounts.proposal}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Negotiation</span>
                    </div>
                    <div className="text-right font-mono font-semibold">{dealCounts.negotiation}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 border-t pt-3 font-semibold">
                    <div>Total Deals</div>
                    <div className="text-right font-mono">
                      {dealCounts.prospecting + dealCounts.qualification + dealCounts.proposal + dealCounts.negotiation}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Sync Activity Log</CardTitle>
                  <CardDescription>Recent synchronization operations and their status</CardDescription>
                </div>
                <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear All Logs
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear All Sync Logs?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all sync history from the database. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={clearAllLogs}
                        disabled={isClearingLogs}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isClearingLogs ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isClearingLogs ? 'Clearing...' : 'Clear Logs'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex gap-3">
                <Select value={filters.entityType} onValueChange={(v) => setFilters({ ...filters, entityType: v })}>
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="full_sync">Full Sync</SelectItem>
                    <SelectItem value="deal">Deal</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="checklist">Checklist</SelectItem>
                    <SelectItem value="comment">Comment</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="pod">POD</SelectItem>
                    <SelectItem value="deal_fields">Deal Fields</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No sync logs found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs">
                            {log.synced_at ? format(new Date(log.synced_at), 'MMM dd, HH:mm:ss') : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {log.sync_type === 'pull' ? (
                              <Badge variant="secondary" className="gap-1">
                                <CloudDownload className="h-3 w-3" /> Pull
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1">
                                <CloudUpload className="h-3 w-3" /> Push
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="capitalize">{log.entity_type}</TableCell>
                          <TableCell>{renderStatusBadge(log.status)}</TableCell>
                          <TableCell className="text-xs">
                            {log.synced_by_user?.email || 'System'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {log.error_message ? (
                              <span className="text-destructive">{log.error_message}</span>
                            ) : (
                              log.control_tower_id || '-'
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduled Jobs Tab */}
        <TabsContent value="scheduled" className="space-y-4">
          {configLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Automatic Pull Sync</CardTitle>
                  <CardDescription>Scheduled inbound sync from Control Tower</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-pull">Enable Automatic Pull</Label>
                    <Switch
                      id="auto-pull"
                      checked={config.auto_pull_enabled}
                      onCheckedChange={(checked) => setConfig({ ...config, auto_pull_enabled: checked })}
                    />
                  </div>
                  {config.auto_pull_enabled && (
                    <div className="space-y-2">
                      <Label>Sync Frequency</Label>
                      <Select
                        value={config.pull_schedule}
                        onValueChange={(v: 'hourly' | 'daily') => setConfig({ ...config, pull_schedule: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Every Hour</SelectItem>
                          <SelectItem value="daily">Daily (at midnight)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Automatic Push Sync</CardTitle>
                  <CardDescription>Scheduled outbound sync to Control Tower</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-push">Enable Automatic Push</Label>
                    <Switch
                      id="auto-push"
                      checked={config.auto_push_enabled}
                      onCheckedChange={(checked) => setConfig({ ...config, auto_push_enabled: checked })}
                    />
                  </div>
                  {config.auto_push_enabled && (
                    <div className="space-y-2">
                      <Label>Sync Frequency</Label>
                      <Select
                        value={config.push_schedule}
                        onValueChange={(v: 'hourly' | 'daily') => setConfig({ ...config, push_schedule: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Every Hour</SelectItem>
                          <SelectItem value="daily">Daily (at midnight)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Additional Options</CardTitle>
                  <CardDescription>Error handling and notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="retry-failed">Retry Failed Syncs</Label>
                      <p className="text-sm text-muted-foreground">Automatically retry failed sync operations</p>
                    </div>
                    <Switch
                      id="retry-failed"
                      checked={config.retry_failed || false}
                      onCheckedChange={(checked) => setConfig({ ...config, retry_failed: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email-failure">Email on Failure</Label>
                      <p className="text-sm text-muted-foreground">Send email notifications for sync failures</p>
                    </div>
                    <Switch
                      id="email-failure"
                      checked={config.email_on_failure || false}
                      onCheckedChange={(checked) => setConfig({ ...config, email_on_failure: checked })}
                    />
                  </div>
                </CardContent>
              </Card>

              <Button onClick={saveConfig} disabled={configSaving}>
                {configSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {configSaving ? 'Saving...' : 'Save Configuration'}
              </Button>
            </>
          )}
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sync Information</CardTitle>
              <CardDescription>How Control Tower synchronization works</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">🔽 Pull Sync (Control Tower → BD Portal)</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
                  <li>Imports active deals and their details</li>
                  <li>Syncs client information</li>
                  <li>Updates checklist items from Control Tower</li>
                  <li>Preserves local comments and annotations</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">🔼 Push Sync (BD Portal → Control Tower)</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
                  <li>Sends new comments to Control Tower deals</li>
                  <li>Updates completed checklist items</li>
                  <li>Maintains bidirectional data consistency</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">⚡ Best Practices</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
                  <li>Use "Pull Now (Active)" for regular updates</li>
                  <li>Reserve "Full Sync" for initial setup or major discrepancies</li>
                  <li>Monitor the Activity Log for sync errors</li>
                  <li>Keep automation enabled for continuous synchronization</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Connection Status</CardTitle>
              <CardDescription>Control Tower API connection details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  <Badge variant="outline" className="bg-green-600/10 text-green-700">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Connected
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">API Version</span>
                  <span className="text-sm text-muted-foreground">v2.0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sync Logs Retention</span>
                  <span className="text-sm text-muted-foreground">20 minutes (auto-cleanup)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Email Recipients for Sync Failures
              </CardTitle>
              <CardDescription>Select admin and superadmin users to receive notifications when sync failures occur</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recipientLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="select-recipient">Select Admin/Superadmin User</Label>
                    <div className="flex gap-2">
                      <Select value={selectedUser} onValueChange={setSelectedUser}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Choose a user to add..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableUsers
                            .filter((user) => !emailRecipients.find((r) => r.id === user.id))
                            .map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.full_name || 'Unknown'} ({user.email})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={addEmailRecipient}
                        disabled={recipientSaving || !selectedUser}
                        size="sm"
                      >
                        {recipientSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Add
                      </Button>
                    </div>
                    {availableUsers.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No admin or superadmin users found in the system.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Current Recipients ({emailRecipients.length})</Label>
                    {emailRecipients.length === 0 ? (
                      <div className="p-3 rounded-md bg-muted/50 text-sm text-muted-foreground">
                        No email recipients configured. Select a user above to add them to the notification list.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {emailRecipients.map((recipient) => (
                          <div
                            key={recipient.id}
                            className="flex items-center justify-between p-3 rounded-md border bg-card"
                          >
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-medium">
                                {recipient.full_name || 'Unknown'}
                              </span>
                              <span className="text-xs text-muted-foreground">{recipient.email}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteEmailRecipient(recipient.id)}
                              disabled={recipientSaving}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md">
                    <p className="text-sm text-blue-900 dark:text-blue-200">
                      <strong>Note:</strong> These recipients will receive email notifications when sync failures are detected (3 or more failed syncs in 24 hours).
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataSyncCenter;

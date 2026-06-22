import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Users, 
  Shield,
  TrendingUp,
  Activity,
  BarChart3,
  CheckCircle2,
  Clock,
  Zap,
  RefreshCw,
  Briefcase,
  Building2,
  CloudUpload,
  Loader2
} from "lucide-react";
import { useSystemStats } from "@/hooks/useSystemStats";
import { Skeleton } from "@/components/ui/skeleton";
import { useSyncControlTowerFull } from '@/hooks/useSyncControlTowerFull';
import { useSyncControlTowerDeals } from '@/hooks/useSyncControlTowerDeals';
import { useSyncControlTowerClientsAPI } from '@/hooks/useControlTowerData';
import { usePushToControlTower } from '@/hooks/usePushToControlTower';
import { formatDistanceToNow } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const AdminPanel = () => {
  const { data, isLoading } = useSystemStats();
  const { mutate: triggerFullSync, isPending: isFullSyncing } = useSyncControlTowerFull();
  const { syncDeals, isSyncing: isSyncingDeals } = useSyncControlTowerDeals();
  const { mutate: triggerClientsAPISync, isPending: isSyncingClientsAPI } = useSyncControlTowerClientsAPI();
  const { pushDeal } = usePushToControlTower();
  
  // Get last sync time
  const { data: lastSync } = useQuery({
    queryKey: ['last-sync-time'],
    queryFn: async () => {
      const { data } = await supabase
        .from('control_tower_sync_log')
        .select('synced_at')
        .eq('sync_type', 'pull')
        .order('synced_at', { ascending: false })
        .limit(1)
        .single();
      return data?.synced_at;
    }
  });
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time system overview and administrative metrics
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Shield className="h-3 w-3" />
          Super Admin Access
        </Badge>
      </div>

      {/* System Health Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{data?.stats.totalUsers || 0}</div>
                <p className="text-xs text-muted-foreground">Active system users</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Integrations</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{data?.stats.totalIntegrations || 0}</div>
                <p className="text-xs text-muted-foreground">Connected services</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">EOD Submissions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{data?.stats.todayEOD || 0}</div>
                <p className="text-xs text-muted-foreground">Submitted today</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Agent Runs</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{data?.stats.aiAgentRuns24h || 0}</div>
                <p className="text-xs text-muted-foreground">Last 24 hours</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Usage Analytics</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Review logins, activity volume, and low-usage alerts.
          </p>
          <Button size="sm" asChild>
            <Link to="/adminpanel/usage-analytics">View Usage Analytics</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Quick Data Sync */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Quick Data Sync
              </CardTitle>
              <CardDescription>
                Get the latest data from Control Tower
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/adminpanel/data-sync">
                View All Options
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Button 
              onClick={() => triggerFullSync()}
              disabled={isFullSyncing}
              className="h-auto flex-col items-start p-4 gap-2"
            >
              <div className="flex items-center gap-2 w-full">
                {isFullSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="font-semibold">Full Sync</span>
              </div>
              <span className="text-xs text-left opacity-90">
                All data in correct order
              </span>
            </Button>

            <Button 
              variant="outline"
              onClick={() => syncDeals()}
              disabled={isSyncingDeals}
              className="h-auto flex-col items-start p-4 gap-2"
            >
              <div className="flex items-center gap-2 w-full">
                {isSyncingDeals ? <Loader2 className="h-4 w-4 animate-spin" /> : <Briefcase className="h-4 w-4" />}
                <span className="font-semibold">Deals</span>
              </div>
              <span className="text-xs text-left text-muted-foreground">
                Active deals & projects
              </span>
            </Button>

            <Button 
              variant="outline"
              onClick={() => triggerClientsAPISync()}
              disabled={isSyncingClientsAPI}
              className="h-auto flex-col items-start p-4 gap-2"
            >
              <div className="flex items-center gap-2 w-full">
                {isSyncingClientsAPI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
                <span className="font-semibold">Clients</span>
              </div>
              <span className="text-xs text-left text-muted-foreground">
                Via REST API
              </span>
            </Button>

            <Button 
              variant="outline"
              onClick={() => {/* Push functionality - navigate to sync center */}}
              asChild
              className="h-auto flex-col items-start p-4 gap-2"
            >
              <Link to="/adminpanel/data-sync"
                className="flex flex-col items-start gap-2"
              >
              <div className="flex items-center gap-2 w-full">
                <CloudUpload className="h-4 w-4" />
                <span className="font-semibold">Push</span>
              </div>
                <span className="text-xs text-left text-muted-foreground">
                  Send updates to CT
                </span>
              </Link>
            </Button>
          </div>
          
          {lastSync && (
            <p className="text-xs text-muted-foreground text-center mt-4">
              Last sync: {formatDistanceToNow(new Date(lastSync), { addSuffix: true })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest administrative actions and system events</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : data?.recentActivity && data.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {data.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{activity.action}</p>
                    {activity.user && (
                      <p className="text-xs text-muted-foreground">User: {activity.user}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                  <Badge variant={activity.type === 'system' ? 'secondary' : 'outline'}>
                    {activity.type}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
          )}
        </CardContent>
      </Card>

      {/* Quick Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total PODs</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{data?.stats.totalPods || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Target Niches</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{data?.stats.totalNiches || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Products/Services</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{data?.stats.totalProducts || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm font-medium">Operational</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPanel;
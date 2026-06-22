import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { HealthSnapshot } from '@/hooks/useControlTowerHealth';
import { formatDistanceToNow } from 'date-fns';

interface HealthOverviewCardProps {
  latestHealth: HealthSnapshot | null;
  isLoading: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  activeAlertsCount: number;
}

export const HealthOverviewCard = ({
  latestHealth,
  isLoading,
  onRefresh,
  isRefreshing,
  activeAlertsCount,
}: HealthOverviewCardProps) => {
  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 50) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getHealthBadge = (score: number) => {
    if (score >= 90) return { label: 'Excellent', variant: 'default' as const };
    if (score >= 70) return { label: 'Good', variant: 'secondary' as const };
    if (score >= 50) return { label: 'Fair', variant: 'outline' as const };
    return { label: 'Poor', variant: 'destructive' as const };
  };

  const getScoreIcon = (current: number, baseline: number = 75) => {
    if (current > baseline) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (current < baseline) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Integration Health</h3>
          <Button variant="ghost" size="sm" disabled>
            <RefreshCw className="h-4 w-4 animate-spin" />
          </Button>
        </div>
        <div className="space-y-3">
          <div className="h-24 bg-muted animate-pulse rounded-lg" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (!latestHealth) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Integration Health</h3>
          <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <div className="text-center py-8">
          <Activity className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">No health data available yet</p>
          <Button onClick={onRefresh} disabled={isRefreshing}>
            {isRefreshing ? 'Running Check...' : 'Run Health Check'}
          </Button>
        </div>
      </Card>
    );
  }

  const healthBadge = getHealthBadge(latestHealth.overall_health_score);
  const breakdown = latestHealth.metrics_detail?.breakdown || {};

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Integration Health</h3>
          <Badge variant={healthBadge.variant}>{healthBadge.label}</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Overall Score */}
      <div className="mb-6 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Overall Health Score</p>
            <p className={`text-4xl font-bold ${getHealthColor(latestHealth.overall_health_score)}`}>
              {latestHealth.overall_health_score.toFixed(1)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-1">Last Check</p>
            <p className="text-sm">
              {formatDistanceToNow(new Date(latestHealth.snapshot_at), { addSuffix: true })}
            </p>
            {activeAlertsCount > 0 && (
              <Badge variant="destructive" className="mt-2">
                {activeAlertsCount} Active Alert{activeAlertsCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Health Breakdown */}
      <div className="space-y-3">
        <p className="text-sm font-medium mb-2">Health Metrics</p>
        
        <div className="grid grid-cols-2 gap-3">
          {/* Sync Success */}
          <div className="p-3 border rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Sync Success</p>
              {getScoreIcon(breakdown.sync_success || 0)}
            </div>
            <p className="text-lg font-semibold">{(breakdown.sync_success || 0).toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {latestHealth.failed_syncs_count_24h} failed (24h)
            </p>
          </div>

          {/* API Response */}
          <div className="p-3 border rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">API Response</p>
              {getScoreIcon(breakdown.api_responsiveness || 0)}
            </div>
            <p className="text-lg font-semibold">{(breakdown.api_responsiveness || 0).toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {latestHealth.api_response_time_ms}ms avg
            </p>
          </div>

          {/* Data Completeness */}
          <div className="p-3 border rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Data Complete</p>
              {getScoreIcon(breakdown.data_completeness || 0)}
            </div>
            <p className="text-lg font-semibold">{(breakdown.data_completeness || 0).toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {latestHealth.unmapped_owners_count + latestHealth.unmapped_pms_count + latestHealth.unmapped_pods_count} unmapped
            </p>
          </div>

          {/* Data Freshness */}
          <div className="p-3 border rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Data Fresh</p>
              {getScoreIcon(breakdown.sync_freshness || 0)}
            </div>
            <p className="text-lg font-semibold">{(breakdown.sync_freshness || 0).toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {latestHealth.stale_deals_count} stale deals
            </p>
          </div>
        </div>

        {/* Pending Push Items */}
        {latestHealth.pending_push_items > 0 && (
          <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
              {latestHealth.pending_push_items} items pending push to Control Tower
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

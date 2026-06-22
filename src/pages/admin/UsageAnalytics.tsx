import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Activity, BellRing, Trophy } from 'lucide-react';
import { useSendLowUsageNotifications, useUserActivityStats } from '@/hooks/useUserActivityStats';

export default function UsageAnalytics() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const { toast } = useToast();
  const { data, isLoading } = useUserActivityStats({ period, recentLimit: 20 });
  const sendLowUsageNotifications = useSendLowUsageNotifications();

  const handleSendLowUsage = async () => {
    try {
      const result = await sendLowUsageNotifications.mutateAsync(7);
      toast({
        title: 'Low usage reminders sent',
        description: `Notified ${result.notifiedCount} users. ${result.skippedCount} already notified.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send reminders.';
      toast({
        title: 'Failed to send reminders',
        description: message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Usage Analytics</h1>
          <p className="text-muted-foreground">Track logins and core activity across the team</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={period} onValueChange={(value) => setPeriod(value as typeof period)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" asChild>
            <Link to="/adminpanel/usage-analytics/members">View Team Stats</Link>
          </Button>
          <Button onClick={handleSendLowUsage} disabled={sendLowUsageNotifications.isPending}>
            <BellRing className="mr-2 h-4 w-4" />
            {sendLowUsageNotifications.isPending ? 'Sending...' : 'Send Low Usage Reminder'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Users (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold">{data?.summary.activeUsers.day ?? 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Users (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold">{data?.summary.activeUsers.week ?? 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Users (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold">{data?.summary.activeUsers.month ?? 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Logins</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold">{data?.summary.totalLogins ?? 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Top Active Users
            </CardTitle>
            <CardDescription>Ranked by activity volume</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((item) => (
                  <Skeleton key={item} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {data?.leaderboard.map((entry, index) => (
                  <div
                    key={entry.userId}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{entry.userName}</p>
                      <p className="text-xs text-muted-foreground">Rank #{index + 1}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="mb-1">{entry.activityCount} actions</Badge>
                      <p className="text-xs text-muted-foreground">{entry.loginCount} logins</p>
                    </div>
                  </div>
                ))}
                {data?.leaderboard.length === 0 && (
                  <p className="text-sm text-muted-foreground">No activity yet.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Breakdown
            </CardTitle>
            <CardDescription>Totals by action type</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((item) => (
                  <Skeleton key={item} className="h-6 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(data?.activityBreakdown || {})
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 8)
                  .map(([action, count]) => (
                    <div key={action} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{action.replace(/_/g, ' ')}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                {Object.keys(data?.activityBreakdown || {}).length === 0 && (
                  <p className="text-sm text-muted-foreground">No activity recorded.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest activity across the team</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((item) => (
                <Skeleton key={item} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {data?.recentActivity.map((entry) => (
                <div key={entry.id} className="flex items-start justify-between border-b pb-3 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{entry.userName}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.action.replace(/_/g, ' ')} {entry.resourceType ? `• ${entry.resourceType}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                  </span>
                </div>
              ))}
              {data?.recentActivity.length === 0 && (
                <p className="text-sm text-muted-foreground">No recent activity.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft } from 'lucide-react';
import { useUserActivityMemberStats } from '@/hooks/useUserActivityStats';

export default function UsageAnalyticsMemberDetail() {
  const { userId } = useParams<{ userId: string }>();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  const { data, isLoading } = useUserActivityMemberStats(userId ?? null, period);

  const activityRows = useMemo(() => {
    const breakdown = data?.activityBreakdown || {};
    return Object.entries(breakdown)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count);
  }, [data?.activityBreakdown]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link to="/adminpanel/usage-analytics/members" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Team Stats
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mt-2">
            {data?.member?.full_name || data?.member?.email || 'Member Usage'}
          </h1>
          <p className="text-muted-foreground">
            {data?.member?.email || 'Usage analytics details'}
          </p>
        </div>
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Breakdown</CardTitle>
          <CardDescription>Counts by action type for the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((item) => (
                <Skeleton key={item} className="h-6 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {activityRows.map((row) => (
                <div key={row.action} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{row.action.replace(/_/g, ' ')}</span>
                  <span className="font-medium">{row.count}</span>
                </div>
              ))}
              {activityRows.length === 0 && (
                <p className="text-sm text-muted-foreground">No activity recorded for this period.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

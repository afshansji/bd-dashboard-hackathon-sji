import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  DollarSign, 
  Clock, 
  Bell, 
  AlertTriangle,
  TrendingUp,
  MessageSquare,
  Activity
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ClientHealthStats {
  activeDeals: number;
  pipelineValue: number;
  daysSinceContact: number | null;
  pendingFollowups: number;
  overdueFollowups: number;
  recentComments: Array<{
    content: string;
    createdAt: string;
    dealTitle: string;
  }>;
  dealsAtRisk: number;
  avgDealVelocity: number | null;
}

interface ClientHealthPanelProps {
  stats: ClientHealthStats | undefined;
  isLoading: boolean;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function getContactHealthColor(days: number | null): string {
  if (days === null) return "text-muted-foreground";
  if (days <= 7) return "text-green-600";
  if (days <= 14) return "text-amber-600";
  return "text-red-600";
}

function getContactHealthBg(days: number | null): string {
  if (days === null) return "bg-muted";
  if (days <= 7) return "bg-green-500/10";
  if (days <= 14) return "bg-amber-500/10";
  return "bg-red-500/10";
}

export function ClientHealthPanel({ stats, isLoading }: ClientHealthPanelProps) {
  if (isLoading) {
    return (
      <Card className="p-4 space-y-4">
        <Skeleton className="h-5 w-32" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">No stats available</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Client Health
        </h3>
        {stats.overdueFollowups > 0 && (
          <Badge variant="destructive" className="text-xs">
            {stats.overdueFollowups} overdue
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {/* Active Deals & Pipeline */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-lg bg-primary/5 border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <TrendingUp className="h-3 w-3" />
              Active Deals
            </div>
            <p className="text-lg font-semibold">{stats.activeDeals}</p>
          </div>
          <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <DollarSign className="h-3 w-3" />
              Pipeline Value
            </div>
            <p className="text-lg font-semibold text-green-600">
              {formatCurrency(stats.pipelineValue)}
            </p>
          </div>
        </div>

        {/* Days Since Contact */}
        <div className={`p-3 rounded-lg border ${getContactHealthBg(stats.daysSinceContact)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Last Contact
            </div>
            <span className={`text-sm font-medium ${getContactHealthColor(stats.daysSinceContact)}`}>
              {stats.daysSinceContact === null
                ? "No activity"
                : stats.daysSinceContact === 0
                ? "Today"
                : `${stats.daysSinceContact} days ago`}
            </span>
          </div>
        </div>

        {/* Follow-ups */}
        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Bell className="h-3 w-3" />
              Pending Follow-ups
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{stats.pendingFollowups}</span>
              {stats.overdueFollowups > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5">
                  {stats.overdueFollowups} overdue
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Deals at Risk */}
        {stats.dealsAtRisk > 0 && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-red-600">
                <AlertTriangle className="h-3 w-3" />
                Deals at Risk
              </div>
              <span className="text-sm font-medium text-red-600">{stats.dealsAtRisk}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Stalled &gt;14 days
            </p>
          </div>
        )}

        {/* Avg Deal Velocity */}
        {stats.avgDealVelocity !== null && (
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Avg Deal Age</span>
              <span className="text-sm font-medium">{stats.avgDealVelocity} days</span>
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      {stats.recentComments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-2">
            <MessageSquare className="h-3 w-3" />
            Recent Activity
          </h4>
          <ScrollArea className="h-[120px]">
            <div className="space-y-2">
              {stats.recentComments.map((comment, idx) => (
                <div key={idx} className="text-xs p-2 rounded bg-muted/50">
                  <p className="font-medium text-[10px] text-muted-foreground mb-1">
                    {comment.dealTitle} • {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </p>
                  <p className="line-clamp-2">{comment.content}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </Card>
  );
}

import { Card } from "@/components/ui/card";
import { Activity, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface EngagementCardProps {
  score?: number | null;
  lastActivity?: string | null;
}

export function EngagementCard({ score, lastActivity }: EngagementCardProps) {
  if (!score && !lastActivity) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-1">Engagement</h3>
            <p className="text-muted-foreground text-sm">Profile activity indicators</p>
          </div>
        </div>

        <div className="space-y-3">
          {score !== null && score !== undefined && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Profile Quality Score</span>
              </div>
              <Badge variant={score >= 80 ? "default" : "secondary"}>
                {score}%
              </Badge>
            </div>
          )}

          {lastActivity && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Last Activity</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {format(new Date(lastActivity), 'MMM d, yyyy')}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

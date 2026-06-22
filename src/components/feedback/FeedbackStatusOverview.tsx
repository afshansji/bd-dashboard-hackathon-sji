import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FeedbackStatus } from "@/features/feedback/api";
import { FEEDBACK_STATUS_LABELS } from "@/features/feedback/constants";

interface StatusSummary {
  label: string;
  counts: Record<FeedbackStatus, number>;
  total: number;
}

interface FeedbackStatusOverviewProps {
  bugSummary: StatusSummary;
  featureSummary: StatusSummary;
}

const STATUS_ORDER: FeedbackStatus[] = ["open", "in_review", "resolved", "closed"];

function StatusColumn({ label, counts, total }: StatusSummary) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {STATUS_ORDER.map((status) => {
          const value = counts[status] ?? 0;
          const percent = total > 0 ? Math.round((value / total) * 100) : 0;
          return (
            <div key={status} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {FEEDBACK_STATUS_LABELS[status]}
                </span>
                <span className="font-medium">{value}</span>
              </div>
              <Progress value={percent} className="h-2" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function FeedbackStatusOverview({ bugSummary, featureSummary }: FeedbackStatusOverviewProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <StatusColumn {...bugSummary} />
      <StatusColumn {...featureSummary} />
    </div>
  );
}

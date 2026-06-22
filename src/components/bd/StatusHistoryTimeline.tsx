import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadgeWithIcon } from "./StatusBadgeWithIcon";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Bot, Edit } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { CampaignContactStatus } from "@/features/campaign-detail/types";
import type { StatusHistoryEntry } from "@/hooks/useCampaignContactStatusHistory";

interface StatusHistoryTimelineProps {
  history: StatusHistoryEntry[];
}

const triggerIcons = {
  manual: Edit,
  research_completed: Bot,
  ai_agent_completed: Bot,
  keyword_detected: Bot,
};

const triggerLabels = {
  manual: "Manual update",
  research_completed: "Auto-updated after research",
  ai_agent_completed: "Auto-updated after AI analysis",
  keyword_detected: "Auto-detected from comment",
};

export function StatusHistoryTimeline({ history }: StatusHistoryTimelineProps) {
  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Status History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No status changes yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Status History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((entry, index) => {
            const TriggerIcon = triggerIcons[entry.change_trigger as keyof typeof triggerIcons] || Edit;
            const isLast = index === history.length - 1;

            return (
              <div key={entry.id} className="relative">
                {!isLast && (
                  <div className="absolute left-4 top-10 bottom-0 w-px bg-border" />
                )}
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <TriggerIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <StatusBadgeWithIcon status={entry.new_status as CampaignContactStatus} />
                      {entry.old_status && (
                        <>
                          <span className="text-xs text-muted-foreground">from</span>
                          <StatusBadgeWithIcon status={entry.old_status as CampaignContactStatus} />
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <time dateTime={entry.changed_at}>
                        {formatDistanceToNow(new Date(entry.changed_at), { addSuffix: true })}
                      </time>
                      <span>•</span>
                      <span>{triggerLabels[entry.change_trigger as keyof typeof triggerLabels] || entry.change_trigger}</span>
                    </div>
                    {entry.notes && (
                      <p className="text-sm text-muted-foreground">{entry.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

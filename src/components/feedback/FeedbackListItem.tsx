import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FeedbackReport, FeedbackStatus } from "@/features/feedback/api";
import { FEEDBACK_STATUS_LABELS } from "@/features/feedback/constants";
import { MessageSquare, ThumbsUp } from "lucide-react";

const STATUS_STYLES: Record<FeedbackStatus, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-100",
  in_review: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100",
  resolved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100",
  closed: "bg-slate-200 text-slate-700 dark:bg-slate-800/60 dark:text-slate-100",
};

interface FeedbackListItemProps {
  item: FeedbackReport;
}

export function FeedbackListItem({ item }: FeedbackListItemProps) {
  return (
    <Link
      to={`/feedback/${item.id}`}
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition hover:border-primary/40"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={item.type === "bug" ? "destructive" : "default"}>
          {item.type === "bug" ? "Bug" : "Feature"} #{item.feedback_number ?? "—"}
        </Badge>
        {item.module ? (
          <Badge variant="secondary" className="text-xs">
            {item.module}
          </Badge>
        ) : null}
        <Badge className={cn("text-xs", STATUS_STYLES[item.status])}>
          {FEEDBACK_STATUS_LABELS[item.status]}
        </Badge>
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground line-clamp-1">{item.subject}</h3>
        {item.description ? (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {item.description}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1">
              <ThumbsUp className="h-3.5 w-3.5" />
              {item.upvote_count ?? 0}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              {item.comment_count ?? 0}
            </span>
          </div>
          {(item.submitted_by_name || item.email) && (
            <span className="text-xs">
              Submitted by: <span className="font-medium">{item.submitted_by_name || item.email}</span>
            </span>
          )}
        </div>
        <span className="whitespace-nowrap">{new Date(item.created_at).toLocaleDateString()}</span>
      </div>
    </Link>
  );
}

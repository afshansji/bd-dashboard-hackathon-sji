import { Fragment, useMemo } from "react";
import { CalendarClock, CheckCircle2, Loader2, Sparkles, Timer, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type {
  CampaignActivity,
  CampaignAIAgentRun,
  CampaignProjectTask,
} from "../types";

interface ExecutionTimelineProps {
  activities: CampaignActivity[];
  tasks: CampaignProjectTask[];
  aiAgentRuns: CampaignAIAgentRun[];
}

type TimelineItemType = "activity" | "task" | "ai-run";

interface TimelineItem {
  id: string;
  type: TimelineItemType;
  title: string;
  description?: string | null;
  timestamp: string;
  status?: string | null;
  meta?: string | null;
}

const TYPE_LABELS: Record<TimelineItemType, string> = {
  activity: "Campaign Activity",
  task: "Project Task",
  "ai-run": "AI Agent Run",
};

const STATUS_BADGE_VARIANTS: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-800",
  complete: "bg-emerald-100 text-emerald-800",
  running: "bg-blue-100 text-blue-800",
  pending: "bg-slate-100 text-slate-800",
  failed: "bg-red-100 text-red-800",
  blocked: "bg-amber-100 text-amber-800",
  in_progress: "bg-indigo-100 text-indigo-800",
  archived: "bg-slate-200 text-slate-800",
};

const getTimestampValue = (timestamp: string) => {
  const date = new Date(timestamp);
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
};

const formatTimestamp = (timestamp: string) => {
  try {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return timestamp;
    return date.toLocaleString();
  } catch (error) {
    return timestamp;
  }
};

const buildDescriptionFromActivity = (activity: CampaignActivity) => {
  if (activity.activity_data?.note) {
    return String(activity.activity_data.note);
  }

  if (activity.activity_type === "ai_summary_created") {
    return "AI generated campaign summary";
  }

  return activity.activity_type.replace(/_/g, " ");
};

const iconForType = (type: TimelineItemType) => {
  switch (type) {
    case "task":
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    case "ai-run":
      return <Sparkles className="h-4 w-4 text-purple-600" />;
    default:
      return <CalendarClock className="h-4 w-4 text-sky-600" />;
  }
};

const iconForStatus = (status?: string | null) => {
  switch (status) {
    case "completed":
    case "complete":
      return <CheckCircle2 className="h-3 w-3" />;
    case "running":
      return <Loader2 className="h-3 w-3 animate-spin" />;
    case "failed":
      return <XCircle className="h-3 w-3" />;
    case "in_progress":
      return <Timer className="h-3 w-3" />;
    default:
      return null;
  }
};

export function ExecutionTimeline({ activities, tasks, aiAgentRuns }: ExecutionTimelineProps) {
  const timelineItems = useMemo(() => {
    const activityItems: TimelineItem[] = activities.map((activity) => ({
      id: `activity-${activity.id}`,
      type: "activity",
      title: TYPE_LABELS.activity,
      description: buildDescriptionFromActivity(activity),
      timestamp: activity.performed_at,
      status: activity.activity_type,
      meta: activity.performed_by ? `By ${activity.performed_by}` : null,
    }));

    const taskItems: TimelineItem[] = tasks.map((task) => ({
      id: `task-${task.id}`,
      type: "task",
      title: task.name,
      description: task.ai_summary ?? undefined,
      timestamp: task.completed_at ?? task.last_activity_at ?? task.due_date ?? task.created_at ?? new Date().toISOString(),
      status: task.status,
      meta: task.assignee ? `Owner: ${task.assignee}` : null,
    }));

    const runItems: TimelineItem[] = aiAgentRuns.map((run) => ({
      id: `run-${run.id}`,
      type: "ai-run",
      title: run.agent_name ?? "AI Agent Run",
      description: run.output_summary,
      timestamp: run.completed_at ?? run.started_at,
      status: run.status,
      meta: run.completed_at ? undefined : "In progress",
    }));

    return [...activityItems, ...taskItems, ...runItems].sort((a, b) =>
      getTimestampValue(b.timestamp) - getTimestampValue(a.timestamp),
    );
  }, [activities, tasks, aiAgentRuns]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Execution Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {timelineItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No execution activity captured yet. As tasks progress or automations run, updates will appear here.
          </p>
        ) : (
          <div className="space-y-4">
            {timelineItems.map((item, index) => (
              <Fragment key={item.id}>
                <div className="flex gap-3">
                  <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full border bg-background">
                    {iconForType(item.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{item.title}</p>
                      <span className="text-xs text-muted-foreground">{formatTimestamp(item.timestamp)}</span>
                    </div>
                    {item.description ? (
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2">
                      {item.status ? (
                        <Badge
                          variant="secondary"
                          className={`${STATUS_BADGE_VARIANTS[item.status] ?? "bg-slate-100 text-slate-800"} gap-1 capitalize`}
                        >
                          {iconForStatus(item.status)}
                          <span>{item.status.replace(/_/g, " ")}</span>
                        </Badge>
                      ) : null}
                      {item.meta ? <span className="text-xs text-muted-foreground">{item.meta}</span> : null}
                    </div>
                  </div>
                </div>
                {index !== timelineItems.length - 1 ? <Separator /> : null}
              </Fragment>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

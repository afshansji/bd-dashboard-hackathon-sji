import { Fragment } from "react";
import { Brain, Loader2, MessageSquareText, NotebookPen, Sparkles, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { CampaignAITask, CampaignAIAgentRun } from "../types";

interface AIInsightPanelProps {
  summary?: string | null;
  postMortem?: string | null;
  aiAgentRuns: CampaignAIAgentRun[];
  aiTasks: CampaignAITask[];
}

const STATUS_ICONS: Record<CampaignAIAgentRun["status"], JSX.Element> = {
  pending: <Loader2 className="h-3 w-3 animate-spin" />,
  running: <Loader2 className="h-3 w-3 animate-spin" />,
  completed: <Sparkles className="h-3 w-3" />,
  failed: <XCircle className="h-3 w-3" />,
};

const TASK_STATUS_VARIANTS: Record<CampaignAITask["status"], string> = {
  pending: "bg-slate-100 text-slate-700",
  running: "bg-indigo-100 text-indigo-700",
  completed: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
};

export function AIInsightPanel({ summary, postMortem, aiAgentRuns, aiTasks }: AIInsightPanelProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" /> AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <MessageSquareText className="h-4 w-4" /> Summary
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {summary ?? "The AI agent has not generated a summary for this campaign yet."}
          </p>
        </section>
        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <NotebookPen className="h-4 w-4" /> Post-mortem
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {postMortem ?? "A post-mortem will appear here after the campaign is marked as completed."}
          </p>
        </section>
        <Separator />
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">Agent Runs</h3>
            <Badge variant="outline" className="bg-background text-xs">{aiAgentRuns.length}</Badge>
          </div>
          {aiAgentRuns.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No AI agent activity logged yet. When automations execute they will appear here.
            </p>
          ) : (
            <ScrollArea className="h-[160px] pr-2">
              <div className="space-y-3">
                {aiAgentRuns.map((run) => (
                  <div key={run.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="gap-1 capitalize">
                          {STATUS_ICONS[run.status]}
                          {run.status}
                        </Badge>
                        <span className="font-medium">{run.agent_name ?? "AI Agent"}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {run.completed_at
                          ? `Completed ${new Date(run.completed_at).toLocaleString()}`
                          : `Started ${new Date(run.started_at).toLocaleString()}`}
                      </span>
                    </div>
                    {run.output_summary ? (
                      <p className="mt-2 text-xs text-muted-foreground">{run.output_summary}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </section>
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">AI Task Queue</h3>
            <Badge variant="outline" className="bg-background text-xs">{aiTasks.length}</Badge>
          </div>
          {aiTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No AI tasks queued for this campaign.</p>
          ) : (
            <ScrollArea className="h-[160px] pr-2">
              <div className="space-y-3">
                {aiTasks.map((task) => (
                  <Fragment key={task.id}>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium capitalize">{task.task_type.replace(/_/g, " ")}</p>
                        <Badge className={`${TASK_STATUS_VARIANTS[task.status]} capitalize`}>
                          {task.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(task.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Separator />
                  </Fragment>
                ))}
              </div>
            </ScrollArea>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

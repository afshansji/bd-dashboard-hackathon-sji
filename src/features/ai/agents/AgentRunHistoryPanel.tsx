import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgentRunHistory } from "@/hooks/useAgentRunHistory";
import type { AgentRunHistoryRow } from "@/Api/aiAgents";

type ProviderTelemetry = {
  provider?: string;
  model?: string;
  latencyMs?: number;
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
};

interface AgentRunHistoryPanelProps {
  agentId?: string;
}

function ProviderBadge({ provider }: { provider: ProviderTelemetry }) {
  const providerName = provider.provider;
  const modelName = provider.model;
  const label = [providerName, modelName].filter(Boolean).join(" • ") || "Unknown provider";
  return <Badge variant="outline" className="font-normal">{label}</Badge>;
}

function RunHistoryItem({ run }: { run: AgentRunHistoryRow }) {
  const summary = (run.ai_summary?.summary as string) || "No summary available";
  const createdAt = formatDistanceToNow(new Date(run.created_at), { addSuffix: true });
  const output = run.output as { telemetry?: ProviderTelemetry[]; provider_chain?: ProviderTelemetry[] } | undefined;
  const telemetry = Array.isArray(output?.provider_chain) ? output.provider_chain : [];
  const telemetrySummary = Array.isArray(output?.telemetry) ? output?.telemetry : [];
  const primaryTokenUsage = telemetrySummary?.[0]?.tokenUsage?.totalTokens;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium">{summary}</p>
          <p className="text-xs text-muted-foreground">{createdAt}</p>
        </div>
        <Badge variant={run.status === "completed" ? "secondary" : "outline"}>{run.status}</Badge>
      </div>
      {telemetry.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {telemetry.map((entry, index) => (
            <ProviderBadge key={`${run.id}-${index}`} provider={entry} />
          ))}
        </div>
      )}
      <div className="text-xs text-muted-foreground">
        Tokens used: {primaryTokenUsage ?? "n/a"}
      </div>
    </div>
  );
}

export function AgentRunHistoryPanel({ agentId }: AgentRunHistoryPanelProps) {
  const { data, isLoading } = useAgentRunHistory(agentId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent runs</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-80">
          <div className="px-6 py-4 space-y-4">
            {isLoading && (
              <div className="space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Separator />
              </div>
            )}

            {!isLoading && (!data || data.length === 0) && (
              <p className="text-sm text-muted-foreground">No execution history yet. Click 'Run Agent' to start.</p>
            )}

            {data?.map((run, index) => (
              <div key={run.id}>
                <RunHistoryItem run={run} />
                {index < (data.length - 1) && <Separator className="my-4" />}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

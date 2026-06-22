import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useAgentList } from "@/hooks/useAgentList";
import { useRunAIAgent } from "@/hooks/useRunAIAgent";
import { useUpdateAgentDetails } from "@/hooks/useUpdateAgentDetails";
import { useTotalAgentRuns, useRunCountByAgent } from "@/hooks/useAgentRunCounts";
import { useAuth } from "@/hooks/useAuth";
import { AgentConfigModal } from "@/features/ai/agents/AgentConfigModal";
import { AgentRunnerModal, hasSpecializedRunner } from "@/features/ai/agents/AgentRunnerModal";
import type { AIAgent, AgentRunHistoryRow } from "@/Api/aiAgents";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Plus,
  History,
  MessageSquare,
  Play,
  Pencil,
  Pause,
  Trash2,
  Search,
  BarChart3,
  MessageCircle,
  CheckSquare,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CATEGORY_ICONS: Record<string, typeof Bot> = {
  general: Bot,
  analysis: BarChart3,
  communication: MessageCircle,
  task_management: CheckSquare,
  linkedin: MessageCircle,
};

function AgentCard({
  agent,
  runCount,
  onEdit,
  onRun,
  onChat,
  onToggle,
}: {
  agent: AIAgent;
  runCount: number;
  onEdit: () => void;
  onRun: () => void;
  onChat: () => void;
  onToggle: () => void;
}) {
  const isActive = agent.is_active ?? agent.is_enabled ?? true;
  const Icon = CATEGORY_ICONS[agent.category || agent.type || "general"] || Bot;

  return (
    <Card className="group hover:shadow-md transition-shadow rounded-xl">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold leading-tight">{agent.name}</p>
              <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                {agent.description || agent.name}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs shrink-0">
            {agent.category || agent.type || "general"}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {agent.memory_enabled && (
            <Badge variant="outline" className="text-xs font-normal">
              Memory
            </Badge>
          )}
          {runCount > 0 && (
            <Badge variant="outline" className="text-xs font-normal">
              {runCount} uses
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" className="gap-1" onClick={onChat}>
            <MessageSquare className="h-3.5 w-3.5" /> Chat
          </Button>
          <Button size="sm" variant="outline" className="gap-1" onClick={onRun}>
            <Play className="h-3.5 w-3.5" /> Run
          </Button>
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-1 mt-3 pt-3 border-t">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={onToggle}
            title={isActive ? "Disable" : "Enable"}
          >
            {isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground" disabled title="Delete (not implemented)">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

async function fetchRecentRunsAll(limit = 50): Promise<AgentRunHistoryRow[]> {
  const { data, error } = await supabase
    .from("ai_agent_runs")
    .select("id, created_at, status, output, ai_summary, agent_id")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AgentRunHistoryRow[];
}

export default function LinkedInAgentConfig() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: agents = [], isLoading, refetch } = useAgentList();
  const { data: totalRuns = 0 } = useTotalAgentRuns();
  const { data: runCountByAgent = {} } = useRunCountByAgent();
  const runMutation = useRunAIAgent();
  const updateAgent = useUpdateAgentDetails();

  const [search, setSearch] = useState("");
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [runnerAgent, setRunnerAgent] = useState<AIAgent | null>(null);

  const { data: recentRuns = [], isLoading: runsLoading } = useQuery({
    queryKey: ["ai-agent-runs-recent"],
    queryFn: () => fetchRecentRunsAll(50),
    enabled: historyOpen,
  });

  const sortedAgents = useMemo(() => {
    const list = [...agents].sort((a, b) => {
      if (a.slug === "lead-auto-enrichment") return -1;
      if (b.slug === "lead-auto-enrichment") return 1;
      return a.name.localeCompare(b.name);
    });
    const linkedInIndex = list.findIndex((a) => a.slug === "linkedin-message-generator");
    if (linkedInIndex > 3) {
      const [item] = list.splice(linkedInIndex, 1);
      list.splice(3, 0, item);
    }
    return list;
  }, [agents]);

  const filteredAgents = useMemo(() => {
    if (!search.trim()) return sortedAgents;
    const q = search.toLowerCase();
    return sortedAgents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.description?.toLowerCase().includes(q)) ||
        (a.slug?.toLowerCase().includes(q)) ||
        (a.category?.toLowerCase().includes(q))
    );
  }, [sortedAgents, search]);

  const enabledCount = agents.filter((a) => a.is_active ?? a.is_enabled ?? false).length;
  const disabledCount = agents.length - enabledCount;

  const handleRunAgent = async (agent: AIAgent) => {
    if (!user?.id) {
      toast({ title: "Authentication required", variant: "destructive" });
      return;
    }
    try {
      const response = await runMutation.mutateAsync({
        agent_id: agent.id,
        execution_context: {
          user_id: user.id,
          filters: { category: agent.category ?? agent.type ?? "linkedin" },
        },
      });
      toast({ title: `${agent.name} executed`, description: response.summary || "Run completed." });
      queryClient.invalidateQueries({ queryKey: ["ai-agent-runs-total"] });
      queryClient.invalidateQueries({ queryKey: ["ai-agent-runs-by-agent"] });
      queryClient.invalidateQueries({ queryKey: ["ai-agent-runs-recent"] });
    } catch (error) {
      toast({
        title: "Execution failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleToggle = (agent: AIAgent) => {
    const next = !(agent.is_active ?? agent.is_enabled ?? false);
    updateAgent.mutate(
      { agentId: agent.id, payload: { is_enabled: next, is_active: next } },
      {
        onSuccess: () => toast({ title: next ? "Agent enabled" : "Agent disabled" }),
        onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-8 w-8 text-primary" />
            AI Agents
          </h1>
          <p className="text-muted-foreground mt-1">
            Create, manage, and run your AI agents.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setHistoryOpen(true)} className="gap-1">
            <History className="h-4 w-4" /> History
          </Button>
          <Button onClick={() => { setEditingAgent(null); setIsEditorOpen(true); }} className="gap-1">
            <Plus className="h-4 w-4" /> Create Agent
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="text-2xl font-bold">{agents.length}</div>
            <div className="text-sm text-muted-foreground">Total Agents</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="text-2xl font-bold">{enabledCount}</div>
            <div className="text-sm text-muted-foreground">Enabled</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="text-2xl font-bold">{disabledCount}</div>
            <div className="text-sm text-muted-foreground">Disabled</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="text-2xl font-bold">{totalRuns}</div>
            <div className="text-sm text-muted-foreground">Total Runs</div>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search agents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="rounded-xl">
              <CardContent className="pt-5 pb-4">
                <Skeleton className="h-20 w-full mb-4" />
                <Skeleton className="h-9 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredAgents.length === 0 ? (
        <Card className="py-16 text-center rounded-xl">
          <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No agents found</h3>
          <p className="text-muted-foreground mb-4">
            {search ? "Try a different search." : "Create your first AI agent to get started."}
          </p>
          {!search && (
            <Button onClick={() => { setEditingAgent(null); setIsEditorOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Create Agent
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              runCount={runCountByAgent[agent.id] ?? 0}
              onEdit={() => { setEditingAgent(agent); setIsEditorOpen(true); }}
              onRun={() => hasSpecializedRunner(agent.slug) ? setRunnerAgent(agent) : handleRunAgent(agent)}
              onChat={() => navigate(`/adminpanel/ai/chat?agent=${agent.id}`)}
              onToggle={() => handleToggle(agent)}
            />
          ))}
        </div>
      )}

      <AgentConfigModal
        agent={editingAgent}
        open={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSuccess={(savedAgent) => {
          setEditingAgent(savedAgent);
          setIsEditorOpen(false);
          refetch();
        }}
      />

      <AgentRunnerModal
        agent={runnerAgent}
        open={runnerAgent !== null}
        onClose={() => setRunnerAgent(null)}
      />

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" /> Execution History
            </DialogTitle>
            <DialogDescription>Recent runs across all agents</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-[50vh] pr-4">
            {runsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : recentRuns.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No runs yet</p>
            ) : (
              <div className="space-y-3">
                {recentRuns.map((run) => {
                  const agentName = agents.find((a) => a.id === run.agent_id)?.name ?? "Unknown";
                  const summary = (run.ai_summary as { summary?: string } | null)?.summary ?? "Run";
                  return (
                    <Card key={run.id}>
                      <CardContent className="pt-4 pb-3 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-sm">{agentName}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{summary}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <Badge variant={run.status === "completed" ? "secondary" : "outline"}>
                          {run.status ?? "—"}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

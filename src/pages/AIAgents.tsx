import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot, Plus, Play, Pause, Pencil, Trash2, MessageSquare,
  Zap, History, Loader2, Brain, BarChart3, CheckSquare, Sparkles,
} from "lucide-react";

import {
  useAIAgentsList, useCreateAgentCRUD, useUpdateAgentCRUD,
  useToggleAgentCRUD, useDeleteAgentCRUD, useRunAgentAdHoc,
  useAgentRunsCRUD, type AIAgentFull, type AgentFormData, type AgentRun,
} from "@/hooks/useAIAgentsCRUD";
import {
  QuickStartWizard, AgentCategoryGuide, SystemPromptGuide,
  MemorySystemGuide, MultiAgentCollaborationInfo, HITLApprovalInfo,
} from "@/components/admin/AgentConfigurationGuide";

const CATEGORY_ICONS: Record<string, typeof Bot> = {
  general: Bot,
  communication: MessageSquare,
  analysis: BarChart3,
  task_management: CheckSquare,
};

function AgentCard({
  agent,
  onEdit,
  onRun,
  onToggle,
  onDelete,
  onChat,
}: {
  agent: AIAgentFull;
  onEdit: () => void;
  onRun: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onChat: () => void;
}) {
  const Icon = CATEGORY_ICONS[agent.category || "general"] || Bot;
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{agent.name}</CardTitle>
              {agent.category && (
                <Badge variant="secondary" className="text-xs mt-1">{agent.category}</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {agent.memory_enabled && (
              <Badge variant="outline" className="text-xs gap-1">
                <Brain className="h-3 w-3" /> Memory
              </Badge>
            )}
            <Badge variant={agent.is_enabled ? "default" : "secondary"}>
              {agent.is_enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {agent.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{agent.description}</p>
        )}
        {agent.usage_count > 0 && (
          <p className="text-xs text-muted-foreground">{agent.usage_count} runs</p>
        )}
        <Separator />
        <div className="flex items-center gap-2 flex-wrap">
          {agent.is_enabled && (
            <>
              <Button size="sm" variant="default" onClick={onChat} className="gap-1">
                <MessageSquare className="h-3.5 w-3.5" /> Chat
              </Button>
              <Button size="sm" variant="outline" onClick={onRun} className="gap-1">
                <Zap className="h-3.5 w-3.5" /> Run
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="ghost" onClick={onToggle}>
            {agent.is_enabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const EMPTY_FORM: AgentFormData = {
  name: "",
  slug: "",
  description: "",
  category: "general",
  system_prompt: "",
  is_enabled: true,
  memory_enabled: false,
};

export default function AIAgents() {
  const navigate = useNavigate();
  const { data: agents, isLoading } = useAIAgentsList();
  const { data: recentRuns } = useAgentRunsCRUD();
  const createAgent = useCreateAgentCRUD();
  const updateAgent = useUpdateAgentCRUD();
  const toggleAgent = useToggleAgentCRUD();
  const deleteAgent = useDeleteAgentCRUD();
  const runAgent = useRunAgentAdHoc();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AgentFormData>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [runDialogAgent, setRunDialogAgent] = useState<AIAgentFull | null>(null);
  const [runInput, setRunInput] = useState("");
  const [runOutput, setRunOutput] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (agent: AIAgentFull) => {
    setEditingId(agent.id);
    setForm({
      name: agent.name,
      slug: agent.slug || "",
      description: agent.description || "",
      category: agent.category || "general",
      system_prompt: agent.system_prompt || "",
      is_enabled: agent.is_enabled ?? true,
      memory_enabled: agent.memory_enabled ?? false,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (editingId) {
      await updateAgent.mutateAsync({ id: editingId, ...form });
    } else {
      await createAgent.mutateAsync(form);
    }
    setFormOpen(false);
  };

  const handleRun = async () => {
    if (!runDialogAgent || !runInput.trim()) return;
    setRunOutput("");
    const result = await runAgent.mutateAsync({ agentId: runDialogAgent.id, input: runInput });
    setRunOutput(result.output || "No output");
  };

  const enabledCount = agents?.filter((a) => a.is_enabled).length || 0;
  const disabledCount = agents?.filter((a) => !a.is_enabled).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6" /> AI Agents
          </h1>
          <p className="text-muted-foreground mt-1">Create and manage AI agents</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setHistoryOpen(true)} className="gap-1">
            <History className="h-4 w-4" /> Execution History
          </Button>
          <Button onClick={openCreate} className="gap-1">
            <Plus className="h-4 w-4" /> Create Agent
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Agents", value: agents?.length || 0, icon: Bot },
          { label: "Enabled", value: enabledCount, icon: Play },
          { label: "Disabled", value: disabledCount, icon: Pause },
          { label: "Total Runs", value: recentRuns?.length || 0, icon: Zap },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <s.icon className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Agent Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-32" /></CardContent></Card>
          ))}
        </div>
      ) : agents?.length === 0 ? (
        <Card className="py-16 text-center">
          <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No agents yet</h3>
          <p className="text-muted-foreground mb-4">Create your first AI agent to get started</p>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Create Agent</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents?.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onEdit={() => openEdit(agent)}
              onRun={() => { setRunDialogAgent(agent); setRunInput(""); setRunOutput(""); }}
              onToggle={() => toggleAgent.mutate({ id: agent.id, is_enabled: !agent.is_enabled })}
              onDelete={() => setDeleteId(agent.id)}
              onChat={() => navigate(`/adminpanel/ai/chat?agent=${agent.id}`)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Agent" : "Create New Agent"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Update the agent configuration" : "Configure a new AI agent"}
            </DialogDescription>
          </DialogHeader>

          {!editingId && <QuickStartWizard />}

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. BD Outreach Writer" />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="Auto-generated from name" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short summary of what this agent does" />
            </div>

            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="communication">Communication</SelectItem>
                  <SelectItem value="analysis">Analysis</SelectItem>
                  <SelectItem value="task_management">Task Management</SelectItem>
                </SelectContent>
              </Select>
              {!editingId && <AgentCategoryGuide />}
            </div>

            <div className="space-y-2">
              <Label>System Prompt *</Label>
              <Textarea
                value={form.system_prompt}
                onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
                placeholder="Define the agent's personality, expertise, and behavior..."
                className="min-h-[120px]"
              />
              <SystemPromptGuide />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Agent</Label>
                <p className="text-xs text-muted-foreground">Allow this agent to be run and chatted with</p>
              </div>
              <Switch checked={form.is_enabled} onCheckedChange={(v) => setForm({ ...form, is_enabled: v })} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Memory Enabled</Label>
                <MemorySystemGuide />
              </div>
              <Switch checked={form.memory_enabled} onCheckedChange={(v) => setForm({ ...form, memory_enabled: v })} />
            </div>

            {!editingId && (
              <>
                <MultiAgentCollaborationInfo />
                <HITLApprovalInfo />
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={!form.name.trim() || !form.system_prompt.trim() || createAgent.isPending || updateAgent.isPending}
            >
              {(createAgent.isPending || updateAgent.isPending) && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingId ? "Update" : "Create"} Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the agent and all its execution history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => { if (deleteId) deleteAgent.mutate(deleteId); setDeleteId(null); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Run Agent Dialog */}
      <Dialog open={!!runDialogAgent} onOpenChange={() => setRunDialogAgent(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" /> Run: {runDialogAgent?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Input</Label>
              <Textarea
                value={runInput}
                onChange={(e) => setRunInput(e.target.value)}
                placeholder="Enter your prompt or question..."
                className="min-h-[80px]"
              />
            </div>
            <Button onClick={handleRun} disabled={runAgent.isPending || !runInput.trim()} className="w-full">
              {runAgent.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />}
              Execute
            </Button>
            {runOutput && (
              <div className="border rounded-lg p-4 bg-muted/30 max-h-[300px] overflow-y-auto prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{runOutput}</ReactMarkdown>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Execution History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" /> Execution History
            </DialogTitle>
            <DialogDescription>Last 50 runs</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div className="space-y-3 pr-4">
              {recentRuns?.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No executions yet</p>
              )}
              {recentRuns?.map((run: AgentRun) => {
                const agentName = agents?.find((a) => a.id === run.agent_id)?.name || "Unknown";
                return (
                  <Card key={run.id}>
                    <CardContent className="pt-4 pb-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{agentName}</span>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              run.status === "completed" ? "default" :
                              run.status === "failed" ? "destructive" : "secondary"
                            }
                          >
                            {run.status}
                          </Badge>
                          {run.latency_ms && (
                            <Badge variant="outline">{run.latency_ms}ms</Badge>
                          )}
                        </div>
                      </div>
                      {run.input && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Input:</p>
                          <p className="text-sm">{typeof run.input === 'string' ? run.input : JSON.stringify(run.input)}</p>
                        </div>
                      )}
                      {run.output && (
                        <div className="border-t pt-2">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Output:</p>
                          <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {typeof run.output === 'string' ? run.output : JSON.stringify(run.output)}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                      {run.error_message && (
                        <p className="text-sm text-destructive">{run.error_message}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(run.created_at).toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

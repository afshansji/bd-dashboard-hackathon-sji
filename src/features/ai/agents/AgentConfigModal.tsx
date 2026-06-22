import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import type { AIAgent, AgentConfigurationEnvelope, AgentProviderConfig } from "@/Api/aiAgents";
import { useRunAIAgent } from "@/hooks/useRunAIAgent";
import { useSaveAgent } from "@/hooks/useSaveAgent";
import {
  DEFAULT_PROVIDER,
  buildAgentFormState,
  createEmptyAgentFormState,
  type AgentFormState,
} from "./types";
import { Loader2, PlayCircle, Sparkles, HelpCircle, ChevronDown, ChevronUp, Users, ShieldCheck, Info } from "lucide-react";

const PROVIDER_OPTIONS = [
  { value: "openai", label: "OpenAI" },
  { value: "openai-mini", label: "OpenAI Mini" },
  { value: "anthropic", label: "Anthropic" },
  { value: "gemini", label: "Google Gemini" },
  { value: "perplexity", label: "Perplexity" },
];

const TABLE_OPTIONS = [
  { value: "deals", label: "Deals" },
  { value: "clients", label: "Clients" },
  { value: "contacts", label: "Contacts" },
  { value: "projects", label: "Projects" },
  { value: "tasks", label: "Tasks" },
];

const DOCUMENT_OPTIONS = [
  { value: "playbooks", label: "Playbooks" },
  { value: "reports", label: "Reports" },
  { value: "briefs", label: "Briefs" },
  { value: "notes", label: "Notes" },
];

const SCHEDULE_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "scheduled", label: "Scheduled" },
];

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const TIMEZONE_OPTIONS = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "US Eastern" },
  { value: "America/Los_Angeles", label: "US Pacific" },
  { value: "Europe/London", label: "UK" },
];

const STEPS = [
  { id: "basic", label: "Basic" },
  { id: "prompt", label: "Prompt" },
  { id: "model", label: "Model" },
  { id: "data", label: "Data" },
  { id: "actions", label: "Actions" },
  { id: "schedule", label: "Schedule" },
  { id: "test", label: "Test" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

interface AgentConfigModalProps {
  agent: AIAgent | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: (agent: AIAgent) => void;
  mode?: 'quick' | 'wizard';
}

const providerDefaults: Record<string, AgentProviderConfig> = {
  primary: { ...DEFAULT_PROVIDER },
  fallback: { ...DEFAULT_PROVIDER },
  research: { provider: "perplexity", model: "sonar-small", temperature: 0.7, maxTokens: 2000 },
};

export function AgentConfigModal({ agent, open, onClose, onSuccess, mode }: AgentConfigModalProps) {
  const { toast } = useToast();
  const saveMutation = useSaveAgent();
  const runMutation = useRunAIAgent();

  // Determine mode: quick for existing agents, wizard for new
  const isQuickMode = mode === 'quick' || (mode === undefined && agent !== null);
  const isWizardMode = !isQuickMode;

  const [formState, setFormState] = useState<AgentFormState>(() => buildAgentFormState(agent));
  const [activeStep, setActiveStep] = useState<StepId>("basic");
  const [maxUnlockedStep, setMaxUnlockedStep] = useState(0);
  const [stepErrors, setStepErrors] = useState<Partial<Record<StepId, string>>>({});
  const [quickGuideOpen, setQuickGuideOpen] = useState(true);
  const [categoryGuideOpen, setCategoryGuideOpen] = useState(false);

  useEffect(() => {
    if (agent) {
      setFormState(buildAgentFormState(agent));
      setMaxUnlockedStep(0);
      setActiveStep("basic");
      setStepErrors({});
    } else {
      setFormState({ ...createEmptyAgentFormState(), category: "general", type: "custom" });
      setMaxUnlockedStep(0);
      setActiveStep("basic");
      setStepErrors({});
    }
  }, [agent]);

  const stepIndex = (id: StepId) => STEPS.findIndex((step) => step.id === id);

  const updateProvider = (target: "primary" | "fallback" | "research", patch: Partial<AgentProviderConfig>) => {
    setFormState((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        providers: {
          ...prev.config.providers,
          [target]: {
            ...(prev.config.providers?.[target] || providerDefaults[target]),
            ...patch,
          },
        },
      },
    }));
  };

  const toggleFeature = (key: keyof NonNullable<AgentConfigurationEnvelope["features"]>, value: boolean) => {
    setFormState((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        features: {
          ...prev.config.features,
          [key]: value,
        },
      },
    }));
  };

  const toggleDataSource = (key: "tables" | "documents", value: string) => {
    setFormState((prev) => {
      const current = new Set(prev.data_source_config?.[key] || []);
      if (current.has(value)) {
        current.delete(value);
      } else {
        current.add(value);
      }
      return {
        ...prev,
        data_source_config: {
          ...prev.data_source_config,
          [key]: Array.from(current),
        },
      };
    });
  };

  const updateSchedule = (patch: Partial<NonNullable<AgentFormState["schedule_config"]>>) => {
    setFormState((prev) => ({
      ...prev,
      schedule_config: {
        ...prev.schedule_config,
        ...patch,
      },
    }));
  };

  const updateStepError = (step: StepId, message: string | null) => {
    setStepErrors((prev) => {
      const next = { ...prev };
      if (message) {
        next[step] = message;
      } else {
        delete next[step];
      }
      return next;
    });
  };

  const validateStep = (step: StepId): boolean => {
    let error: string | null = null;
    switch (step) {
      case "basic": {
        if (!formState.name.trim()) {
          error = "Name is required.";
        } else if (!formState.category?.trim()) {
          error = "Select a category to continue.";
        } else if (!formState.type?.trim()) {
          error = "Agent type is required.";
        }
        break;
      }
      case "prompt": {
        if (!formState.system_prompt?.trim()) {
          error = "Provide a system prompt template.";
        }
        break;
      }
      case "model": {
        const primary = formState.config.providers?.primary;
        if (!primary?.provider) {
          error = "Select a primary provider.";
        } else if (!primary.model) {
          error = "Primary model is required.";
        }
        break;
      }
      case "data": {
        const tables = formState.data_source_config?.tables || [];
        if (tables.length === 0) {
          error = "Choose at least one table data source.";
        }
        break;
      }
      case "actions": {
        error = null;
        break;
      }
      case "schedule": {
        const schedule = formState.schedule_config?.schedule || "manual";
        if (schedule === "scheduled") {
          if (!formState.schedule_config?.frequency) {
            error = "Select a frequency for the schedule.";
          } else if (!formState.schedule_config?.run_at) {
            error = "Specify a run time.";
          }
        }
        break;
      }
      case "test": {
        error = null;
        break;
      }
      default:
        error = null;
    }

    updateStepError(step, error);
    return !error;
  };

  const handleUnlockNext = (currentStep: StepId) => {
    const currentIndex = stepIndex(currentStep);
    setMaxUnlockedStep((prev) => Math.max(prev, currentIndex + 1));
  };

  const handleStepChange = (nextStep: StepId) => {
    if (nextStep === activeStep) return;
    const nextIndex = stepIndex(nextStep);
    if (nextIndex <= maxUnlockedStep) {
      setActiveStep(nextStep);
      return;
    }

    if (validateStep(activeStep)) {
      handleUnlockNext(activeStep);
      const unlockedIndex = stepIndex(activeStep) + 1;
      if (nextIndex <= unlockedIndex) {
        setActiveStep(nextStep);
      }
    }
  };

  const handleNext = () => {
    if (!validateStep(activeStep)) return;
    const currentIndex = stepIndex(activeStep);
    const nextStep = STEPS[currentIndex + 1];
    if (nextStep) {
      handleUnlockNext(activeStep);
      setActiveStep(nextStep.id);
    }
  };

  const handleBack = () => {
    const currentIndex = stepIndex(activeStep);
    const prevStep = STEPS[currentIndex - 1];
    if (prevStep) {
      setActiveStep(prevStep.id);
    }
  };

  const ensureAllStepsValid = () => {
    for (const step of STEPS) {
      if (!validateStep(step.id)) {
        setActiveStep(step.id);
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!agent) {
      if (!formState.name.trim() || !formState.system_prompt?.trim()) {
        toast({
          title: "Required fields",
          description: "Name and System Prompt are required.",
          variant: "destructive",
        });
        return;
      }
    } else if (isWizardMode && !ensureAllStepsValid()) {
      toast({
        title: "Fix validation issues",
        description: "Review each step and resolve the highlighted fields before saving.",
        variant: "destructive",
      });
      return;
    } else if (isQuickMode && (!formState.name.trim() || !formState.system_prompt?.trim())) {
      toast({
        title: "Required fields",
        description: "Name and System Prompt are required.",
        variant: "destructive",
      });
      return;
    }

    try {
      const savedAgent = await saveMutation.mutateAsync(formState);
      toast({
        title: formState.id ? "Agent updated" : "Agent created",
        description: `${savedAgent.name} saved successfully.`,
      });
      onSuccess?.(savedAgent);
      onClose();
    } catch (error) {
      toast({
        title: "Unable to save agent",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleTestRun = async () => {
    if (!formState.id) {
      toast({
        title: "Save agent first",
        description: "Persist the agent before running a dry run.",
      });
      return;
    }

    try {
      const response = await runMutation.mutateAsync({
        agent_id: formState.id,
        execution_context: {
          user_id: "system",
          filters: { category: formState.category || formState.type },
        },
      });

      toast({
        title: "Dry run triggered",
        description: response.summary || "Agent run started successfully.",
      });
    } catch (error) {
      toast({
        title: "Dry run failed",
        description: error instanceof Error ? error.message : "Unknown error encountered.",
        variant: "destructive",
      });
    }
  };

  const renderProviderSection = (label: string, key: "primary" | "fallback" | "research") => {
    const providerConfig = formState.config.providers?.[key] || providerDefaults[key];
    return (
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">{label}</h4>
          {key === "research" && (
            <Switch
              checked={formState.config.features?.enableResearch ?? false}
              onCheckedChange={(checked) => toggleFeature("enableResearch", checked)}
            />
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select
              value={providerConfig.provider}
              onValueChange={(value) => updateProvider(key, { provider: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Model</Label>
            <Input
              value={providerConfig.model}
              onChange={(event) => updateProvider(key, { model: event.target.value })}
              placeholder="Model identifier"
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Temperature</Label>
            <Input
              type="number"
              step="0.1"
              min={0}
              max={2}
              value={providerConfig.temperature ?? ""}
              onChange={(event) =>
                updateProvider(key, {
                  temperature: event.target.value ? Number(event.target.value) : undefined,
                })
              }
              placeholder="0.0 - 2.0"
            />
          </div>
          <div className="space-y-2">
            <Label>Max Tokens</Label>
            <Input
              type="number"
              min={0}
              value={providerConfig.maxTokens ?? ""}
              onChange={(event) =>
                updateProvider(key, {
                  maxTokens: event.target.value ? Number(event.target.value) : undefined,
                })
              }
              placeholder="e.g. 2000"
            />
          </div>
        </div>
      </div>
    );
  };

  const createView = !agent && (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create Agent</DialogTitle>
        <DialogDescription>Configure a new AI agent</DialogDescription>
      </DialogHeader>
      <TooltipProvider>
        <div className="space-y-4 mt-4">
          <Collapsible open={quickGuideOpen} onOpenChange={setQuickGuideOpen} className="rounded-lg bg-primary/10 border border-primary/20">
            <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left font-medium hover:bg-primary/5 rounded-t-lg">
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Quick Start Guide
              </span>
              {quickGuideOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ol className="list-decimal list-inside space-y-2 px-4 pb-4 text-sm text-muted-foreground">
                <li>Give your agent a descriptive name</li>
                <li>Pick a category that matches its purpose</li>
                <li>Write a clear system prompt defining behavior</li>
                <li>Choose whether to enable conversation memory</li>
                <li>Save and test with the Run button</li>
              </ol>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={categoryGuideOpen} onOpenChange={setCategoryGuideOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm font-medium hover:bg-muted/50">
              <span className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                Category Guide
              </span>
              {categoryGuideOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 text-xs text-muted-foreground space-y-2">
                <p><strong>General:</strong> Versatile assistant for various tasks.</p>
                <p><strong>Communication:</strong> Email drafts, outreach, messaging.</p>
                <p><strong>Analysis:</strong> Data analysis, reports, insights.</p>
                <p><strong>Task Management:</strong> Planning, tracking, prioritization.</p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Alert className="bg-muted/50">
            <Users className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Multi-Agent Teams:</strong> Create specialized agents for different tasks. Each agent can focus on a specific domain while users switch between them as needed.
            </AlertDescription>
          </Alert>

          <Alert className="bg-muted/50">
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Human-in-the-Loop:</strong> All agent outputs are presented to users for review. No automated actions are taken without human approval.
            </AlertDescription>
          </Alert>

          <div className="space-y-4 pt-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-name">Name *</Label>
                <Input
                  id="create-name"
                  value={formState.name}
                  onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Research Analyst"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-slug">Slug</Label>
                <Input
                  id="create-slug"
                  value={formState.slug ?? ""}
                  onChange={(e) => setFormState((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="auto-generated"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                value={formState.description ?? ""}
                onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Short summary of what this agent does"
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formState.category ?? "general"}
                onValueChange={(v) => setFormState((prev) => ({ ...prev, category: v, type: v === "linkedin" ? "linkedin" : "custom" }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="communication">Communication</SelectItem>
                  <SelectItem value="analysis">Analysis</SelectItem>
                  <SelectItem value="task_management">Task Management</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="create-prompt">System Prompt *</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    Define the agent&apos;s personality, expertise, and behavior. Be specific about tone and domain.
                  </TooltipContent>
                </Tooltip>
              </div>
              <Textarea
                id="create-prompt"
                className="min-h-[120px] resize-y"
                value={formState.system_prompt ?? ""}
                onChange={(e) => setFormState((prev) => ({
                  ...prev,
                  system_prompt: e.target.value,
                  prompt_template: e.target.value,
                }))}
                placeholder="You are a helpful assistant that..."
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">Enable Agent</p>
                <p className="text-xs text-muted-foreground">Allow this agent to be run and chatted with</p>
              </div>
              <Switch
                checked={formState.is_enabled ?? true}
                onCheckedChange={(v) => setFormState((prev) => ({ ...prev, is_enabled: v, is_active: v }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium">Memory Enabled</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    When enabled, the agent remembers previous messages in a conversation for contextual follow-ups.
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                checked={formState.memory_enabled ?? false}
                onCheckedChange={(v) => setFormState((prev) => ({ ...prev, memory_enabled: v }))}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending || !formState.name?.trim() || !formState.system_prompt?.trim()} className="gap-2">
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create Agent
            </Button>
          </DialogFooter>
        </div>
      </TooltipProvider>
    </DialogContent>
  );

  const editView = agent && (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Edit Agent</DialogTitle>
        <DialogDescription>Update your AI agent configuration</DialogDescription>
      </DialogHeader>
      <TooltipProvider>
        <div className="space-y-4 mt-4">
          <Collapsible open={quickGuideOpen} onOpenChange={setQuickGuideOpen} className="rounded-lg bg-primary/10 border border-primary/20">
            <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left font-medium hover:bg-primary/5 rounded-t-lg">
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Quick Start Guide
              </span>
              {quickGuideOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ol className="list-decimal list-inside space-y-2 px-4 pb-4 text-sm text-muted-foreground">
                <li>Give your agent a descriptive name</li>
                <li>Pick a category that matches its purpose</li>
                <li>Write a clear system prompt defining behavior</li>
                <li>Choose whether to enable conversation memory</li>
                <li>Save and test with the Run button</li>
              </ol>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={categoryGuideOpen} onOpenChange={setCategoryGuideOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm font-medium hover:bg-muted/50">
              <span className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                Category Guide
              </span>
              {categoryGuideOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 text-xs text-muted-foreground space-y-2">
                <p><strong>General:</strong> Versatile assistant for various tasks.</p>
                <p><strong>Communication:</strong> Email drafts, outreach, messaging.</p>
                <p><strong>Analysis:</strong> Data analysis, reports, insights.</p>
                <p><strong>Task Management:</strong> Planning, tracking, prioritization.</p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Alert className="bg-muted/50">
            <Users className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Multi-Agent Teams:</strong> Create specialized agents for different tasks. Each agent can focus on a specific domain while users switch between them as needed.
            </AlertDescription>
          </Alert>

          <Alert className="bg-muted/50">
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Human-in-the-Loop:</strong> All agent outputs are presented to users for review. No automated actions are taken without human approval.
            </AlertDescription>
          </Alert>

          <div className="space-y-4 pt-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={formState.name}
                  onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Research Analyst"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-slug">Slug</Label>
                <Input
                  id="edit-slug"
                  value={formState.slug ?? ""}
                  onChange={(e) => setFormState((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="auto-generated"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formState.description ?? ""}
                onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Short summary of what this agent does"
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formState.category ?? "general"}
                onValueChange={(v) => setFormState((prev) => ({ ...prev, category: v, type: v === "linkedin" ? "linkedin" : "custom" }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="communication">Communication</SelectItem>
                  <SelectItem value="analysis">Analysis</SelectItem>
                  <SelectItem value="task_management">Task Management</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="edit-prompt">System Prompt *</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    Define the agent&apos;s personality, expertise, and behavior. Be specific about tone and domain.
                  </TooltipContent>
                </Tooltip>
              </div>
              <Textarea
                id="edit-prompt"
                className="min-h-[120px] resize-y"
                value={formState.system_prompt ?? ""}
                onChange={(e) => setFormState((prev) => ({
                  ...prev,
                  system_prompt: e.target.value,
                  prompt_template: e.target.value,
                }))}
                placeholder="You are a helpful assistant that..."
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">Enable Agent</p>
                <p className="text-xs text-muted-foreground">Allow this agent to be run and chatted with</p>
              </div>
              <Switch
                checked={formState.is_enabled ?? true}
                onCheckedChange={(v) => setFormState((prev) => ({ ...prev, is_enabled: v, is_active: v }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium">Memory Enabled</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    When enabled, the agent remembers previous messages in a conversation for contextual follow-ups.
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                checked={formState.memory_enabled ?? false}
                onCheckedChange={(v) => setFormState((prev) => ({ ...prev, memory_enabled: v }))}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            {formState.id && (
              <Button variant="secondary" onClick={handleTestRun} disabled={runMutation.isPending} className="gap-2">
                {runMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                {runMutation.isPending ? "Running..." : "Run dry test"}
              </Button>
            )}
            <Button onClick={handleSave} disabled={saveMutation.isPending || !formState.name?.trim() || !formState.system_prompt?.trim()} className="gap-2">
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Update Agent
            </Button>
          </DialogFooter>
        </div>
      </TooltipProvider>
    </DialogContent>
  );

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      {!agent ? createView : editView}
    </Dialog>
  );
}

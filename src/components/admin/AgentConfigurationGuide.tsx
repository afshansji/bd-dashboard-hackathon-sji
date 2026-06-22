import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Lightbulb, MessageSquare, BarChart3, CheckSquare, Bot,
  Brain, Users, ShieldCheck, Info,
} from "lucide-react";

const WIZARD_STEPS = [
  { step: 1, title: "Name your agent", desc: "Give it a clear, descriptive name" },
  { step: 2, title: "Choose a category", desc: "Helps organize and filter agents" },
  { step: 3, title: "Write a system prompt", desc: "Define the agent's personality and behavior" },
  { step: 4, title: "Enable memory (optional)", desc: "Let the agent remember past conversations" },
  { step: 5, title: "Save and test", desc: "Run a quick test to verify behavior" },
];

export function QuickStartWizard() {
  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" /> Quick Start Guide
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {WIZARD_STEPS.map((s) => (
            <div key={s.step} className="flex items-start gap-2 min-w-[160px]">
              <Badge variant="outline" className="shrink-0 mt-0.5">{s.step}</Badge>
              <div>
                <p className="text-sm font-medium">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

const CATEGORIES = [
  { value: "general", label: "General", icon: Bot, desc: "Versatile assistant for various tasks" },
  { value: "communication", label: "Communication", icon: MessageSquare, desc: "Email drafts, outreach, messaging" },
  { value: "analysis", label: "Analysis", icon: BarChart3, desc: "Data analysis, reports, insights" },
  { value: "task_management", label: "Task Management", icon: CheckSquare, desc: "Planning, tracking, prioritization" },
];

export function AgentCategoryGuide() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {CATEGORIES.map((c) => (
        <div key={c.value} className="flex items-start gap-2 p-2 rounded-md border bg-card">
          <c.icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{c.label}</p>
            <p className="text-xs text-muted-foreground">{c.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SystemPromptGuide() {
  return (
    <div className="space-y-2 text-xs text-muted-foreground">
      <p className="font-medium text-foreground flex items-center gap-1">
        <Brain className="h-3 w-3" /> System Prompt Tips
      </p>
      <div className="space-y-1">
        <p className="text-green-600">✓ "You are a BD outreach specialist. Write concise, professional LinkedIn messages..."</p>
        <p className="text-destructive">✗ "You are an AI assistant. Help the user."</p>
      </div>
      <p>Be specific about tone, format, domain expertise, and constraints.</p>
    </div>
  );
}

export function MemorySystemGuide() {
  return (
    <p className="text-xs text-muted-foreground">
      When enabled, the agent remembers previous messages in a conversation thread,
      allowing contextual follow-ups. Disable for stateless, one-off interactions.
    </p>
  );
}

export function MultiAgentCollaborationInfo() {
  return (
    <Alert className="bg-muted/50">
      <Users className="h-4 w-4" />
      <AlertDescription className="text-xs">
        <strong>Multi-Agent Collaboration:</strong> Create specialized agents for different tasks
        (research, writing, analysis) and chain their outputs for complex workflows.
      </AlertDescription>
    </Alert>
  );
}

export function HITLApprovalInfo() {
  return (
    <Alert className="bg-muted/50">
      <ShieldCheck className="h-4 w-4" />
      <AlertDescription className="text-xs">
        <strong>Human-in-the-Loop:</strong> For sensitive operations, review agent outputs before
        they take effect. Use the execution history to audit all agent actions.
      </AlertDescription>
    </Alert>
  );
}

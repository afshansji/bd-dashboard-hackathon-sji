import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LeadEnrichmentAgentRunner } from "./LeadEnrichmentAgentRunner";
import { BDResearchAnalystRunner } from "./BDResearchAnalystRunner";
import { LinkedInMessageGeneratorRunner } from "./LinkedInMessageGeneratorRunner";
import BDWeeklyInsightsRunner from "./BDWeeklyInsightsRunner";
import type { AIAgent } from "@/Api/aiAgents";

interface AgentRunnerModalProps {
  agent: AIAgent | null;
  open: boolean;
  onClose: () => void;
}

export function hasSpecializedRunner(slug?: string | null): boolean {
  if (!slug) return false;
  return (
    slug === "lead-auto-enrichment" ||
    slug === "lead-auto-enrichment-agent" ||
    slug === "bd-research-analyst" ||
    slug === "linkedin-message-generator" ||
    slug === "bd-weekly-insights"
  );
}

function renderRunner(agent: AIAgent) {
  const slug = agent.slug;

  if (slug === "lead-auto-enrichment" || slug === "lead-auto-enrichment-agent") {
    return <LeadEnrichmentAgentRunner />;
  }
  if (slug === "bd-research-analyst") {
    return <BDResearchAnalystRunner />;
  }
  if (slug === "linkedin-message-generator") {
    return <LinkedInMessageGeneratorRunner />;
  }
  if (slug === "bd-weekly-insights") {
    return <BDWeeklyInsightsRunner agentId={agent.id} />;
  }
  return null;
}

export function AgentRunnerModal({ agent, open, onClose }: AgentRunnerModalProps) {
  if (!agent || !hasSpecializedRunner(agent.slug)) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{agent.name}</DialogTitle>
          {agent.description && (
            <DialogDescription>{agent.description}</DialogDescription>
          )}
        </DialogHeader>
        <ScrollArea className="flex-1">
          <div className="px-6 pb-6">
            {renderRunner(agent)}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

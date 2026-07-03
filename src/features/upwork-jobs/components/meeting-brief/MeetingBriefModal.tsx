import { useState } from "react";
import {
  ClipboardCopy,
  Loader2,
  Printer,
  Save,
  Sparkles,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import {
  useGenerateMeetingBrief,
  useMeetingBrief,
} from "@/hooks/useMeetingBrief";
import type { LeadWorkspaceState } from "../../types/leadWorkspace";
import type { UpworkJob } from "../../types";
import { MeetingBriefContent } from "./MeetingBriefContent";
import {
  buildSavedNotesBlock,
  copyBriefToClipboard,
  printBrief,
} from "./exportBrief";

interface MeetingBriefModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: UpworkJob;
  workspaceState: LeadWorkspaceState;
  onSaveToNotes: (notes: string) => void;
}

function buildWorkspaceContext(state: LeadWorkspaceState) {
  return {
    notes: state.notes,
    proposalDraft: state.proposalDraft,
    assignedToName: state.assignedToName,
    status: state.status,
    tasks: state.tasks.map((t) => ({ title: t.title, completed: t.completed })),
    recentActivities: state.activities.slice(0, 10).map((a) => ({
      action: a.action,
      detail: a.detail,
    })),
  };
}

export function MeetingBriefModal({
  open,
  onOpenChange,
  job,
  workspaceState,
  onSaveToNotes,
}: MeetingBriefModalProps) {
  const { data: cached, isLoading } = useMeetingBrief(job.id);
  const generate = useGenerateMeetingBrief(job.id);
  const [copied, setCopied] = useState(false);

  const brief = cached?.brief ?? null;
  const generatedAt = cached?.generatedAt ?? null;
  const isGenerating = generate.isPending;

  const handleGenerate = async (force = false) => {
    await generate.mutateAsync({
      workspace: buildWorkspaceContext(workspaceState),
      force,
    });
  };

  const handleCopy = async () => {
    if (!brief) return;
    try {
      await copyBriefToClipboard(brief, job.title);
      setCopied(true);
      toast({ title: "Copied", description: "Meeting brief copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handlePrint = () => {
    printBrief("meeting-brief-print-root");
  };

  const handleExportPdf = () => {
    printBrief("meeting-brief-print-root");
    toast({
      title: "Export PDF",
      description: "Use 'Save as PDF' in the print dialog.",
    });
  };

  const handleSaveToOpportunity = () => {
    if (!brief) return;
    const block = buildSavedNotesBlock(brief);
    const existing = workspaceState.notes.trim();
    const next = existing ? `${existing}\n\n${block}` : block;
    onSaveToNotes(next);
    toast({
      title: "Saved to opportunity",
      description: "Meeting brief summary added to your notes.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[95vh] max-w-6xl flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4 text-left">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-xl">Meeting Brief</DialogTitle>
              <DialogDescription>
                Executive discovery call preparation for {job.title || "this opportunity"}
              </DialogDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {brief ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => void handleCopy()}>
                    <ClipboardCopy className="mr-1.5 h-3.5 w-3.5" />
                    {copied ? "Copied" : "Copy Brief"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleExportPdf}>
                    <Printer className="mr-1.5 h-3.5 w-3.5" />
                    Export PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={handlePrint}>
                    <Printer className="mr-1.5 h-3.5 w-3.5" />
                    Print
                  </Button>
                  <Button size="sm" variant="secondary" onClick={handleSaveToOpportunity}>
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                    Save to Opportunity
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleGenerate(true)}
                    disabled={isGenerating}
                  >
                    Regenerate
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-5">
          {generate.error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>
                {generate.error instanceof Error
                  ? generate.error.message
                  : "Failed to generate meeting brief"}
              </AlertDescription>
            </Alert>
          ) : null}

          {isLoading && !brief ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Loading meeting brief...</p>
            </div>
          ) : null}

          {isGenerating && !brief ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">
                Synthesizing lead data, intelligence reports, and portfolio evidence...
              </p>
            </div>
          ) : null}

          {brief ? (
            <div className="space-y-4">
              {isGenerating ? (
                <div className="flex items-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Regenerating meeting brief...
                </div>
              ) : null}
              <MeetingBriefContent
                brief={brief}
                generatedAt={generatedAt}
                leadTitle={job.title}
              />
            </div>
          ) : null}

          {!isLoading && !isGenerating && !brief ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <Sparkles className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">No meeting brief yet</p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Generate an executive briefing that combines lead details, AI analysis,
                  company research, portfolio matches, and your notes.
                </p>
              </div>
              <Button onClick={() => void handleGenerate()}>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Meeting Brief
              </Button>
            </div>
          ) : null}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { Check, Copy, Loader2, Mail, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useJobLeadOutreach } from "@/hooks/useJobLeadOutreach";
import type { JobLeadOutreachType } from "@/features/upwork-jobs/api/jobLeadOutreach";
import { useLeadWorkspace } from "../hooks/useLeadWorkspace";
import type { UpworkJob } from "../types";
import { getJobLeadSourceLabel } from "../constants/sources";

interface LeadOutreachActionsProps {
  job: UpworkJob;
}

const OUTREACH_LABELS: Record<JobLeadOutreachType, string> = {
  reply: "Suggested reply",
  email: "Suggested email",
};

export function LeadOutreachActions({ job }: LeadOutreachActionsProps) {
  const outreach = useJobLeadOutreach(job.id);
  const { recordOutreach } = useLeadWorkspace(job.id);
  const [visibleType, setVisibleType] = useState<JobLeadOutreachType | null>(null);
  const [results, setResults] = useState<Partial<Record<JobLeadOutreachType, string>>>({});
  const [copiedType, setCopiedType] = useState<JobLeadOutreachType | null>(null);

  const platformLabel = getJobLeadSourceLabel(job.source, job.job_url);

  const handleGenerate = async (type: JobLeadOutreachType) => {
    setVisibleType(type);
    const response = await outreach.mutateAsync(type);
    setResults((prev) => ({ ...prev, [type]: response.content }));
    recordOutreach(type);
  };

  const handleCopy = async (type: JobLeadOutreachType) => {
    const text = results[type];
    if (!text) return;

    await navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const isGenerating = outreach.isPending;
  const generatingType = isGenerating ? visibleType : null;

  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isGenerating}
          onClick={() => void handleGenerate("reply")}
        >
          {generatingType === "reply" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <MessageSquare className="mr-2 h-4 w-4" />
          )}
          Suggested reply
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isGenerating}
          onClick={() => void handleGenerate("email")}
        >
          {generatingType === "email" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Mail className="mr-2 h-4 w-4" />
          )}
          Suggested email
        </Button>
      </div>

      {outreach.error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {outreach.error instanceof Error
              ? outreach.error.message
              : "Failed to generate outreach"}
          </AlertDescription>
        </Alert>
      ) : null}

      {(["reply", "email"] as const).map((type) => {
        if (visibleType !== type) return null;

        const content = results[type];
        const isLoading = isGenerating && generatingType === type;
        if (!content && !isLoading) return null;

        return (
          <div
            key={type}
            className="rounded-lg border bg-muted/30 p-3 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-primary" />
                {OUTREACH_LABELS[type]}
                <span className="font-normal text-muted-foreground">
                  for {platformLabel} · cites our past work when available
                </span>
              </div>
              {content ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void handleCopy(type)}
                >
                  {copiedType === type ? (
                    <>
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </Button>
              ) : null}
            </div>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </div>
            ) : (
              <pre className="whitespace-pre-wrap text-sm text-foreground font-sans">
                {content}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
}

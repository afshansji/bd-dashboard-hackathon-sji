import { useState } from "react";
import { Check, Copy, Loader2, Mail, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useJobLeadOutreach } from "@/hooks/useJobLeadOutreach";
import type { JobLeadOutreachType } from "@/features/upwork-jobs/api/jobLeadOutreach";
import { getJobLeadSourceLabel } from "../../constants/sources";
import type { UpworkJob } from "../../types";
import { useLeadWorkspace } from "../../hooks/useLeadWorkspace";

interface WorkspaceOutreachPanelProps {
  job: UpworkJob;
  type: JobLeadOutreachType;
}

const TYPE_META: Record<
  JobLeadOutreachType,
  { label: string; icon: typeof MessageSquare; description: string }
> = {
  reply: {
    label: "Suggested reply",
    icon: MessageSquare,
    description: "Platform-native reply citing our past work when available",
  },
  email: {
    label: "Suggested email",
    icon: Mail,
    description: "Outreach email with relevant project references",
  },
};

export function WorkspaceOutreachPanel({ job, type }: WorkspaceOutreachPanelProps) {
  const outreach = useJobLeadOutreach(job.id);
  const { recordOutreach } = useLeadWorkspace(job.id);
  const [content, setContent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const meta = TYPE_META[type];
  const Icon = meta.icon;
  const platformLabel = getJobLeadSourceLabel(job.source, job.job_url);

  const handleGenerate = async () => {
    const response = await outreach.mutateAsync(type);
    setContent(response.content);
    recordOutreach(type);
  };

  const handleCopy = async () => {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{meta.label}</h3>
        <p className="text-sm text-muted-foreground">
          for {platformLabel} · {meta.description}
        </p>
      </div>

      <Button onClick={() => void handleGenerate()} disabled={outreach.isPending}>
        {outreach.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="mr-2 h-4 w-4" />
        )}
        Generate {type === "reply" ? "reply" : "email"}
      </Button>

      {outreach.error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {outreach.error instanceof Error
              ? outreach.error.message
              : "Failed to generate outreach"}
          </AlertDescription>
        </Alert>
      ) : null}

      {content || outreach.isPending ? (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Icon className="h-4 w-4 text-primary" />
              Draft
            </div>
            {content ? (
              <Button size="sm" variant="secondary" onClick={() => void handleCopy()}>
                {copied ? (
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
          {outreach.isPending ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </div>
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-sm">{content}</pre>
          )}
        </div>
      ) : null}
    </div>
  );
}

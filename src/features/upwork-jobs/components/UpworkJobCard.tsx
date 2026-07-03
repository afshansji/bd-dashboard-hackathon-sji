import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useAnalyzeOpportunity,
  useOpportunityAnalysis,
} from "@/hooks/useOpportunityAnalysis";
import { formatRelativeTime } from "@/lib/utils";
import { Clock, DollarSign, ExternalLink, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import {
  getJobLeadViewLabel,
  LEAD_TYPE_LABELS,
} from "../constants/sources";
import {
  buildLeadTimeline,
  useLeadWorkspace,
} from "../hooks/useLeadWorkspace";
import type { UpworkJob } from "../types";
import { LeadOutreachActions } from "./LeadOutreachActions";
import { LeadSourceBadge } from "./LeadSourceBadge";
import { OpportunityAnalysisTrigger } from "./OpportunityAnalysisTrigger";
import { LeadActivityTimeline } from "./workspace/LeadActivityTimeline";
import { LeadOwnerBar } from "./workspace/LeadOwnerBar";
import {
  OpportunityWorkspace,
  type WorkspaceTab,
} from "./workspace/OpportunityWorkspace";

interface UpworkJobCardProps {
  job: UpworkJob;
}

function formatBudget(job: UpworkJob): string | null {
  if (job.hourly_rate) return job.hourly_rate;
  if (job.fixed_budget) return job.fixed_budget;
  return null;
}

export function UpworkJobCard({ job }: UpworkJobCardProps) {
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<WorkspaceTab>("overview");
  const { state } = useLeadWorkspace(job.id);
  const { data: cachedAnalysis } = useOpportunityAnalysis(job.id);
  const analyze = useAnalyzeOpportunity(job.id);

  const budget = formatBudget(job);
  const scrapedLabel = job.scraped_at
    ? formatRelativeTime(job.scraped_at)
    : job.posted_time;
  const viewLabel = getJobLeadViewLabel(job.source, job.job_url);

  const analysis = cachedAnalysis?.analysis ?? null;
  const analyzedAt = cachedAnalysis?.analyzedAt ?? null;

  const timelineEvents = useMemo(
    () => buildLeadTimeline(job, state, analyzedAt),
    [job, state, analyzedAt],
  );

  const openWorkspace = (tab: WorkspaceTab = "overview") => {
    setInitialTab(tab);
    setWorkspaceOpen(true);
  };

  const handleAnalyze = async (force = false) => {
    openWorkspace("analysis");
    if (!analysis || force) {
      await analyze.mutateAsync(force);
    }
  };

  return (
    <>
      <Card
        className="cursor-pointer transition-shadow hover:shadow-md"
        onClick={() => openWorkspace("overview")}
      >
        <CardHeader className="space-y-3 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <LeadSourceBadge source={job.source} jobUrl={job.job_url} />
            {job.lead_type ? (
              <Badge variant="outline">{LEAD_TYPE_LABELS[job.lead_type]}</Badge>
            ) : null}
            {job.job_type ? (
              <Badge variant="secondary">{job.job_type}</Badge>
            ) : null}
            {job.experience_level ? (
              <Badge variant="outline">{job.experience_level}</Badge>
            ) : null}
            {scrapedLabel ? (
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {scrapedLabel}
              </span>
            ) : null}
          </div>
          <CardTitle className="text-lg leading-snug">
            {job.title || "Untitled job"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <LeadOwnerBar jobId={job.id} compact showStatus={false} />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {job.client_country ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {job.client_country}
              </span>
            ) : null}
            {budget ? (
              <span className="inline-flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" />
                {budget}
              </span>
            ) : null}
            {job.proposal_count ? (
              <span>Proposals: {job.proposal_count}</span>
            ) : null}
            {job.client_spent ? <span>{job.client_spent}</span> : null}
          </div>

          {job.description ? (
            <p className="line-clamp-3 text-sm text-muted-foreground">
              {job.description}
            </p>
          ) : null}

          {job.skills?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {job.skills.slice(0, 8).map((skill) => (
                <Badge key={skill} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {job.skills.length > 8 ? (
                <Badge variant="outline" className="text-xs">
                  +{job.skills.length - 8} more
                </Badge>
              ) : null}
            </div>
          ) : null}

          {timelineEvents.length > 0 ? (
            <LeadActivityTimeline events={timelineEvents} compact />
          ) : null}

          <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
            {job.job_url ? (
              <Button asChild size="sm" variant="default">
                <a href={job.job_url} target="_blank" rel="noopener noreferrer">
                  {viewLabel}
                  <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </a>
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              onClick={() => openWorkspace("overview")}
            >
              Open workspace
            </Button>
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <OpportunityAnalysisTrigger
              hasAnalysis={Boolean(analysis)}
              analyzedAt={analyzedAt}
              recommendation={analysis?.recommendation ?? null}
              confidence={analysis?.confidence ?? null}
              isAnalyzing={analyze.isPending}
              onAnalyze={() => void handleAnalyze(Boolean(analysis))}
            />
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <LeadOutreachActions job={job} />
          </div>
        </CardContent>
      </Card>

      <OpportunityWorkspace
        open={workspaceOpen}
        onOpenChange={setWorkspaceOpen}
        job={job}
        initialTab={initialTab}
      />
    </>
  );
}

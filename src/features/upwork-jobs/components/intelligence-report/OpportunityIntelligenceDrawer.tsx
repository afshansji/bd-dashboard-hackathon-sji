import { useMemo, useRef } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatRelativeTime } from "@/lib/utils";
import type { OpportunityAnalysis } from "../../types/opportunityAnalysis";
import type { OpportunityIntelligenceReport } from "../../types/intelligenceReport";
import { BusinessRecommendationSection } from "./BusinessRecommendation";
import { CapabilityAssessmentDashboard } from "./CapabilityAssessmentDashboard";
import { CapabilityEvidence } from "./CapabilityEvidence";
import { DeliveryConfidenceSection } from "./DeliveryConfidence";
import { EngineeringComplexitySection } from "./EngineeringComplexity";
import { EvidenceViewer } from "./EvidenceViewer";
import { OpportunityBreakdownSection } from "./OpportunityBreakdown";
import { OpportunitySummary } from "./OpportunitySummary";
import { ReportSection } from "./ReportSection";
import { SkillGapAnalysisSection } from "./SkillGapAnalysis";
import { TeamExpertise } from "./TeamExpertise";
import { OpportunityCopilot } from "../copilot/OpportunityCopilot";
import type { UpworkJob } from "../../types";

interface OpportunityIntelligenceDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: UpworkJob;
  jobTitle: string;
  analysis: OpportunityAnalysis | null;
  analyzedAt: string | null;
  isLoading: boolean;
  isAnalyzing: boolean;
  error: Error | null;
  onAnalyze: (force?: boolean) => void;
}

export function OpportunityIntelligenceDrawer({
  open,
  onOpenChange,
  job,
  jobTitle,
  analysis,
  analyzedAt,
  isLoading,
  isAnalyzing,
  error,
  onAnalyze,
}: OpportunityIntelligenceDrawerProps) {
  const evidenceRef = useRef<HTMLDivElement>(null);
  const report: OpportunityIntelligenceReport | null = analysis?.report ?? null;

  const capabilityRows = useMemo(
    () =>
      report?.capabilityAssessment?.length
        ? report.capabilityAssessment
        : (report?.capabilityCoverage ?? []).map((row) => ({
            capabilityKey: row.capability ?? row.technology,
            label: row.capability ?? row.technology,
            importance: "high" as const,
            coverage: row.coverage,
            level: row.level,
            coverageLabel:
              row.level === "strong" && row.coverage >= 85
                ? ("Excellent" as const)
                : row.level === "strong"
                  ? ("Strong" as const)
                  : row.level === "moderate"
                    ? ("Moderate" as const)
                    : row.level === "weak"
                      ? ("Weak" as const)
                      : ("Unknown" as const),
            repositoryCount: row.contributingRepos.length,
            reason: row.reason,
            matchedEvidence: row.matchedEvidence ?? [],
            contributingRepos: row.contributingRepos,
          })),
    [report],
  );

  const repoUrlById = useMemo(() => {
    const map = new Map<string, string>();
    for (const repo of analysis?.supportingRepositories ?? []) {
      if (repo.url) map.set(repo.id, repo.url);
    }
    for (const item of report?.capabilityEvidence ?? []) {
      for (const project of item.supportingProjects ?? item.repositories ?? []) {
        if (project.repositoryUrl) {
          map.set(project.repositoryId, project.repositoryUrl);
        }
      }
    }
    return map;
  }, [analysis?.supportingRepositories, report?.capabilityEvidence]);

  const handleSelectRepository = (repositoryId: string) => {
    const url = repoUrlById.get(repositoryId);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    evidenceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-3xl lg:max-w-5xl"
      >
        <SheetHeader className="border-b px-6 py-5 text-left">
          <SheetTitle>Opportunity Intelligence Report</SheetTitle>
          <SheetDescription>
            {jobTitle}
            {analyzedAt ? ` · Analyzed ${formatRelativeTime(analyzedAt)}` : ""}
          </SheetDescription>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              size="sm"
              onClick={() => onAnalyze(Boolean(analysis))}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {analysis ? "Re-run Analysis" : "Analyze Opportunity"}
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-5">
          {error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          ) : null}

          {isLoading || isAnalyzing ? (
            <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isAnalyzing ? "Generating intelligence report..." : "Loading analysis..."}
            </div>
          ) : null}

          {!isLoading && !isAnalyzing && analysis && !report ? (
            <Alert className="mb-4">
              <AlertDescription>
                This analysis was generated before the intelligence report format existed.
                Re-run analysis to load the full report.
              </AlertDescription>
            </Alert>
          ) : null}

          {report ? (
            <div className="space-y-4 pb-8">
              <OpportunitySummary
                summary={report.executiveSummary}
                delivery={report.deliveryAssessment}
              />

              <ReportSection
                id="delivery"
                title="Delivery Assessment"
                description="Engineering assessment of whether SJ Innovation can successfully deliver this project."
                defaultOpen
              >
                <DeliveryConfidenceSection
                  delivery={report.deliveryConfidence}
                  assessment={report.deliveryAssessment}
                />
              </ReportSection>

              <ReportSection
                id="capabilities"
                title="Capability Assessment"
                description="Organizational capability coverage — repositories are supporting evidence only."
                defaultOpen
              >
                <CapabilityAssessmentDashboard rows={capabilityRows} />
              </ReportSection>

              <ReportSection
                id="business"
                title="Business Recommendation"
                description="Bid/no-bid assessment based on capability coverage, not repository count."
              >
                <BusinessRecommendationSection
                  recommendation={report.businessRecommendation}
                />
              </ReportSection>

              <ReportSection
                id="evidence"
                title="Repository Evidence"
                description="Supporting projects grouped under each capability area."
              >
                <div ref={evidenceRef}>
                  <CapabilityEvidence
                    items={report.capabilityEvidence}
                    onSelectRepository={handleSelectRepository}
                  />
                </div>
              </ReportSection>

              <ReportSection
                id="breakdown"
                title="Opportunity Breakdown"
                description="Structured view of what the client is asking for."
              >
                <OpportunityBreakdownSection breakdown={report.opportunityBreakdown} />
              </ReportSection>

              <ReportSection
                id="gaps"
                title="Skill Gap Analysis"
                description="Strong, moderate, and weak capability coverage."
              >
                <SkillGapAnalysisSection analysis={report.skillGapAnalysis} />
              </ReportSection>

              <ReportSection
                id="complexity"
                title="Engineering Complexity"
                description="Estimated delivery complexity from scope signals."
              >
                <EngineeringComplexitySection complexity={report.engineeringComplexity} />
              </ReportSection>

              <ReportSection
                id="team"
                title="Suggested Team Expertise"
                description="Recommended roles based on required capabilities."
              >
                <TeamExpertise roles={report.suggestedTeam} />
              </ReportSection>

              <ReportSection
                id="transparency"
                title="Evidence Transparency"
                description="Capability claims linked to indexed repository evidence."
              >
                <EvidenceViewer
                  claims={report.evidenceTransparency}
                  evidenceScope={report.evidenceScope}
                  onSelectRepository={handleSelectRepository}
                />
              </ReportSection>

              <OpportunityCopilot jobId={job.id} enabled={open && Boolean(report)} />
            </div>
          ) : null}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

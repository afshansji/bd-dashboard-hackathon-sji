import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarCheck,
  ExternalLink,
  History,
  Loader2,
  RefreshCw,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { formatRelativeTime } from "@/lib/utils";
import {
  useAnalyzeOpportunity,
  useOpportunityAnalysis,
} from "@/hooks/useOpportunityAnalysis";
import { useGenerateMeetingBrief } from "@/hooks/useMeetingBrief";
import type { OpportunityAnalysis } from "../../types/opportunityAnalysis";
import type { OpportunityIntelligenceReport } from "../../types/intelligenceReport";
import { BusinessRecommendationSection } from "../intelligence-report/BusinessRecommendation";
import { CapabilityAssessmentDashboard } from "../intelligence-report/CapabilityAssessmentDashboard";
import { CapabilityEvidence } from "../intelligence-report/CapabilityEvidence";
import { DeliveryConfidenceSection } from "../intelligence-report/DeliveryConfidence";
import { EngineeringComplexitySection } from "../intelligence-report/EngineeringComplexity";
import { EvidenceViewer } from "../intelligence-report/EvidenceViewer";
import { OpportunityBreakdownSection } from "../intelligence-report/OpportunityBreakdown";
import { OpportunitySummary } from "../intelligence-report/OpportunitySummary";
import { ReportSection } from "../intelligence-report/ReportSection";
import { SkillGapAnalysisSection } from "../intelligence-report/SkillGapAnalysis";
import { TeamExpertise } from "../intelligence-report/TeamExpertise";
import { OpportunityCopilot } from "../copilot/OpportunityCopilot";
import { CompanyWebsiteField } from "../company-research/CompanyWebsiteField";
import { MeetingBriefModal } from "../meeting-brief/MeetingBriefModal";
import { LeadSourceBadge } from "../LeadSourceBadge";
import { LeadOwnerBar } from "./LeadOwnerBar";
import { LeadActivityTimeline } from "./LeadActivityTimeline";
import { WorkspaceOutreachPanel } from "./WorkspaceOutreachPanel";
import { WorkspaceAttachmentsPanel } from "./WorkspaceAttachmentsPanel";
import { useBDTeamMembers } from "@/hooks/useBDTeamMembers";
import {
  buildLeadTimeline,
  useLeadWorkspace,
} from "../../hooks/useLeadWorkspace";
import { getJobLeadViewLabel } from "../../constants/sources";
import type { UpworkJob } from "../../types";
import { WORKSPACE_TABS, type WorkspaceTab } from "./workspaceTabConfig";

export type { WorkspaceTab };

interface OpportunityWorkspaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: UpworkJob;
  initialTab?: WorkspaceTab;
}

function AnalysisSections({
  analysis,
  evidenceRef,
  onSelectRepository,
}: {
  analysis: OpportunityAnalysis;
  evidenceRef: React.RefObject<HTMLDivElement>;
  onSelectRepository: (repositoryId: string) => void;
}) {
  const report: OpportunityIntelligenceReport | null = analysis.report ?? null;
  if (!report) return null;

  const capabilityRows =
    report.capabilityAssessment?.length
      ? report.capabilityAssessment
      : (report.capabilityCoverage ?? []).map((row) => ({
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
        }));

  return (
    <div className="space-y-4">
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
        <BusinessRecommendationSection recommendation={report.businessRecommendation} />
      </ReportSection>
      <ReportSection
        id="evidence-inline"
        title="Repository Evidence"
        description="Supporting projects grouped under each capability area."
      >
        <div ref={evidenceRef}>
          <CapabilityEvidence
            items={report.capabilityEvidence}
            onSelectRepository={onSelectRepository}
          />
        </div>
      </ReportSection>
      <ReportSection id="breakdown" title="Opportunity Breakdown">
        <OpportunityBreakdownSection breakdown={report.opportunityBreakdown} />
      </ReportSection>
      <ReportSection id="gaps" title="Skill Gap Analysis">
        <SkillGapAnalysisSection analysis={report.skillGapAnalysis} />
      </ReportSection>
      <ReportSection id="complexity" title="Engineering Complexity">
        <EngineeringComplexitySection complexity={report.engineeringComplexity} />
      </ReportSection>
      <ReportSection id="team" title="Suggested Team Expertise">
        <TeamExpertise roles={report.suggestedTeam} />
      </ReportSection>
      <ReportSection id="transparency" title="Evidence Transparency">
        <EvidenceViewer
          claims={report.evidenceTransparency}
          evidenceScope={report.evidenceScope}
          onSelectRepository={onSelectRepository}
        />
      </ReportSection>
    </div>
  );
}

export function OpportunityWorkspace({
  open,
  onOpenChange,
  job,
  initialTab = "overview",
}: OpportunityWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialTab);
  const [taskInput, setTaskInput] = useState("");
  const [meetingBriefOpen, setMeetingBriefOpen] = useState(false);
  const evidenceRef = useRef<HTMLDivElement>(null);
  const tabTriggerRefs = useRef<Partial<Record<WorkspaceTab, HTMLButtonElement>>>({});

  const {
    data: cachedAnalysis,
    isLoading: isLoadingAnalysis,
    error: loadError,
  } = useOpportunityAnalysis(job.id);
  const analyze = useAnalyzeOpportunity(job.id);
  const generateBrief = useGenerateMeetingBrief(job.id);
  const workspace = useLeadWorkspace(job.id);
  const { data: teamMembers = [] } = useBDTeamMembers();

  const analysis = cachedAnalysis?.analysis ?? null;
  const analyzedAt = cachedAnalysis?.analyzedAt ?? null;
  const analysisError = analyze.error ?? loadError;
  const report = analysis?.report ?? null;

  const timelineEvents = useMemo(
    () => buildLeadTimeline(job, workspace.state, analyzedAt),
    [job, workspace.state, analyzedAt],
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
    setActiveTab("evidence");
  };

  const handleAnalyze = async (force = false) => {
    setActiveTab("analysis");
    if (!analysis || force) {
      await analyze.mutateAsync(force);
    }
  };

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
  };

  const handlePrepareMe = async () => {
    setMeetingBriefOpen(true);
    await generateBrief.mutateAsync({
      workspace: {
        notes: workspace.state.notes,
        proposalDraft: workspace.state.proposalDraft,
        assignedToName: workspace.state.assignedToName,
        status: workspace.state.status,
        tasks: workspace.state.tasks.map((t) => ({
          title: t.title,
          completed: t.completed,
        })),
        recentActivities: workspace.state.activities.slice(0, 10).map((a) => ({
          action: a.action,
          detail: a.detail,
        })),
      },
      force: false,
    });
  };

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    const activeTrigger = tabTriggerRefs.current[activeTab];
    activeTrigger?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeTab, open]);

  const viewLabel = getJobLeadViewLabel(job.source, job.job_url);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-4xl lg:max-w-6xl"
      >
        <SheetHeader className="space-y-0 border-b bg-muted/20 px-6 py-5 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <LeadSourceBadge source={job.source} jobUrl={job.job_url} />
            <Badge variant="outline" className="text-[11px] font-medium">
              Opportunity Workspace
            </Badge>
          </div>
          <SheetTitle className="mt-3 text-2xl font-bold leading-tight tracking-tight">
            {job.title || "Untitled lead"}
          </SheetTitle>
          <SheetDescription className="mt-1.5 line-clamp-2 text-xs leading-relaxed">
            {job.description || "Everything about this opportunity lives here."}
          </SheetDescription>
          <div className="mt-4">
            <LeadOwnerBar jobId={job.id} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {job.job_url ? (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="transition-transform active:scale-[0.98]"
              >
                <a href={job.job_url} target="_blank" rel="noopener noreferrer">
                  {viewLabel}
                  <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </a>
              </Button>
            ) : null}
            <Button
              size="sm"
              className="transition-transform active:scale-[0.98]"
              onClick={() => void handleAnalyze(Boolean(analysis))}
              disabled={analyze.isPending}
            >
              {analyze.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {analysis ? "Re-run Analysis" : "Analyze Opportunity"}
            </Button>
            <Button
              size="sm"
              variant="default"
              className="bg-violet-600 transition-transform hover:bg-violet-700 active:scale-[0.98]"
              onClick={() => void handlePrepareMe()}
              disabled={generateBrief.isPending}
            >
              {generateBrief.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserCheck className="mr-2 h-4 w-4" />
              )}
              Prepare Me
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="transition-transform active:scale-[0.98]"
              onClick={workspace.bookMeeting}
            >
              <CalendarCheck className="mr-2 h-4 w-4" />
              Book meeting
            </Button>
          </div>
        </SheetHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as WorkspaceTab)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="border-b bg-background/80 px-4 py-3 backdrop-blur-sm">
            <div className="overflow-x-auto pb-1">
              <TabsList className="inline-flex h-auto w-max min-w-0 justify-start gap-1.5 rounded-full bg-muted/60 p-1.5 pr-2">
                {WORKSPACE_TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.value}
                      ref={(node) => {
                        if (node) tabTriggerRefs.current[tab.value] = node;
                      }}
                      value={tab.value}
                      className={cn(
                        "shrink-0 rounded-full px-3.5 py-2 text-xs font-medium transition-all duration-200",
                        "data-[state=active]:bg-background data-[state=active]:text-foreground",
                        "data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground",
                        "hover:text-foreground",
                        tab.value === "chat" &&
                          "data-[state=inactive]:bg-violet-500/10 data-[state=inactive]:text-violet-700 dark:data-[state=inactive]:text-violet-300",
                      )}
                    >
                      <Icon className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                      {tab.label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>
          </div>

          <ScrollArea className="flex-1 px-6 py-6">
            <TabsContent
              value="overview"
              className="mt-0 animate-in fade-in-0 slide-in-from-bottom-1 duration-300 space-y-8 pb-8"
            >
              <CompanyWebsiteField
                jobId={job.id}
                compact
                onResearchStart={() => setActiveTab("company")}
              />
              <LeadActivityTimeline events={timelineEvents} />
              {job.description ? (
                <div className="animate-in fade-in-0 duration-300 rounded-xl border bg-card p-5 shadow-sm">
                  <h3 className="mb-1 text-sm font-semibold tracking-tight">Lead details</h3>
                  <p className="text-xs text-muted-foreground">Original posting content</p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                    {job.description}
                  </p>
                </div>
              ) : null}
              {analyzedAt ? (
                <p className="text-xs text-muted-foreground">
                  Last analyzed {formatRelativeTime(analyzedAt)}
                </p>
              ) : null}
            </TabsContent>

            <TabsContent value="company" className="mt-0 pb-8">
              <CompanyWebsiteField jobId={job.id} />
            </TabsContent>

            <TabsContent value="analysis" className="mt-0 pb-8">
              {analysisError ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>
                    {analysisError instanceof Error
                      ? analysisError.message
                      : "Analysis failed"}
                  </AlertDescription>
                </Alert>
              ) : null}
              {isLoadingAnalysis || analyze.isPending ? (
                <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {analyze.isPending
                    ? "Generating intelligence report..."
                    : "Loading analysis..."}
                </div>
              ) : null}
              {!isLoadingAnalysis && !analyze.isPending && analysis && !report ? (
                <Alert className="mb-4">
                  <AlertDescription>
                    Re-run analysis to load the full intelligence report format.
                  </AlertDescription>
                </Alert>
              ) : null}
              {analysis && report ? (
                <AnalysisSections
                  analysis={analysis}
                  evidenceRef={evidenceRef}
                  onSelectRepository={handleSelectRepository}
                />
              ) : !isLoadingAnalysis && !analyze.isPending ? (
                <div className="py-10 text-center">
                  <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Run AI analysis to see capability assessment and recommendations.
                  </p>
                  <Button className="mt-4" onClick={() => void handleAnalyze()}>
                    Analyze Opportunity
                  </Button>
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="evidence" className="mt-0 pb-8">
              {report ? (
                <CapabilityEvidence
                  items={report.capabilityEvidence}
                  onSelectRepository={handleSelectRepository}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Run analysis to surface repository evidence.
                </p>
              )}
            </TabsContent>

            <TabsContent
              value="proposal"
              className="mt-0 animate-in fade-in-0 slide-in-from-bottom-1 duration-300 pb-8"
            >
              <div className="space-y-5">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold tracking-tight">Proposal draft</h3>
                  <p className="text-xs text-muted-foreground">
                    Shape your bid narrative. Use Copilot for AI-assisted drafting.
                  </p>
                </div>
                <Textarea
                  value={workspace.state.proposalDraft}
                  onChange={(e) => workspace.setProposalDraft(e.target.value)}
                  placeholder="Write your proposal here, or ask the copilot to draft one..."
                  className="min-h-[280px]"
                />
              </div>
            </TabsContent>

            <TabsContent value="reply" className="mt-0 pb-8">
              <WorkspaceOutreachPanel job={job} type="reply" />
            </TabsContent>

            <TabsContent value="email" className="mt-0 pb-8">
              <WorkspaceOutreachPanel job={job} type="email" />
            </TabsContent>

            <TabsContent
              value="notes"
              className="mt-0 animate-in fade-in-0 slide-in-from-bottom-1 duration-300 pb-8"
            >
              <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold tracking-tight">Notes</h3>
                    <p className="text-xs text-muted-foreground">
                      Shared with your team — auto-saves as you type
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {workspace.isLoading
                      ? "Loading..."
                      : workspace.notesSaveStatus === "saving"
                        ? "Saving..."
                        : workspace.notesSaveStatus === "error"
                          ? "Save failed"
                          : "Saved"}
                  </span>
                </div>
                <Textarea
                  value={workspace.state.notes}
                  onChange={(e) => workspace.setNotes(e.target.value)}
                  placeholder="Capture context, call notes, or next steps..."
                  className="min-h-[240px]"
                  disabled={workspace.isLoading}
                />
              </div>
            </TabsContent>

            <TabsContent
              value="tasks"
              className="mt-0 animate-in fade-in-0 slide-in-from-bottom-1 duration-300 pb-8"
            >
              <div className="space-y-5" onClick={(e) => e.stopPropagation()}>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold tracking-tight">Tasks</h3>
                  <p className="text-xs text-muted-foreground">
                    Follow-ups for this opportunity — assign to any team member
                  </p>
                </div>
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const title = taskInput.trim();
                    if (!title) return;
                    void workspace.addTask(title);
                    setTaskInput("");
                  }}
                >
                  <Input
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    placeholder="Add a follow-up task..."
                    disabled={workspace.isLoading}
                  />
                  <Button type="submit" disabled={workspace.isLoading}>
                    Add
                  </Button>
                </form>
                <div className="space-y-2">
                  {workspace.state.tasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No tasks yet.</p>
                  ) : (
                    workspace.state.tasks.map((task, index) => (
                      <div
                        key={task.id}
                        className="flex animate-in fade-in-0 slide-in-from-left-1 flex-col gap-2 rounded-xl border bg-card p-3.5 shadow-sm sm:flex-row sm:items-center"
                        style={{ animationDelay: `${index * 40}ms` }}
                      >
                        <label className="flex min-w-0 flex-1 items-center gap-3">
                          <Checkbox
                            checked={task.completed}
                            onCheckedChange={() => void workspace.toggleTask(task.id)}
                          />
                          <span
                            className={
                              task.completed
                                ? "text-sm text-muted-foreground line-through"
                                : "text-sm"
                            }
                          >
                            {task.title}
                          </span>
                        </label>
                        <Select
                          value={task.assignedToId ?? "unassigned"}
                          onValueChange={(value) => {
                            if (value === "unassigned") {
                              void workspace.assignTask(task.id, null, null);
                              return;
                            }
                            const member = teamMembers.find((m) => m.id === value);
                            if (member) {
                              void workspace.assignTask(
                                task.id,
                                member.id,
                                member.full_name,
                              );
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 w-full sm:w-[200px]">
                            <SelectValue placeholder="Assign to..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {teamMembers.map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="timeline" className="mt-0 pb-8">
              <LeadActivityTimeline events={timelineEvents} />
            </TabsContent>

            <TabsContent value="attachments" className="mt-0 pb-8">
              <WorkspaceAttachmentsPanel
                jobId={job.id}
                importedAttachments={
                  Array.isArray(job.attachments) ? job.attachments : []
                }
              />
            </TabsContent>

            <TabsContent value="chat" className="mt-0 pb-8">
              <OpportunityCopilot jobId={job.id} enabled={open && activeTab === "chat"} />
            </TabsContent>

            <TabsContent value="history" className="mt-0 pb-8">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  <h3 className="text-lg font-semibold">Lead history</h3>
                </div>
                <div className="rounded-lg border p-4 text-sm space-y-2">
                  <p>
                    <span className="text-muted-foreground">Imported:</span>{" "}
                    {job.created_at
                      ? new Date(job.created_at).toLocaleString()
                      : "Unknown"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Last updated:</span>{" "}
                    {job.updated_at
                      ? new Date(job.updated_at).toLocaleString()
                      : "Unknown"}
                  </p>
                  {analyzedAt ? (
                    <p>
                      <span className="text-muted-foreground">Last analyzed:</span>{" "}
                      {new Date(analyzedAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="mt-0 pb-8">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Activity log</h3>
                {workspace.state.activities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Assign an owner, change status, or generate outreach to see activity.
                  </p>
                ) : (
                  workspace.state.activities.map((entry) => (
                    <div key={entry.id} className="rounded-lg border p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{entry.action}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(entry.createdAt)}
                        </span>
                      </div>
                      {entry.detail ? (
                        <p className="mt-1 text-muted-foreground">{entry.detail}</p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>

      <MeetingBriefModal
        open={meetingBriefOpen}
        onOpenChange={setMeetingBriefOpen}
        job={job}
        workspaceState={workspace.state}
        onSaveToNotes={workspace.setNotes}
      />
    </Sheet>
  );
}

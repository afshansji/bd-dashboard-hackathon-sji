import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, CalendarDays, ClipboardList, ShieldCheck, TrendingUp, Bot, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BDManagerChatMessages } from "@/components/bd/BDManagerChatMessages";
import { BDManagerChatInput } from "@/components/bd/BDManagerChatInput";
import { QuickBDInsightCards } from "@/components/bd/QuickBDInsightCards";
import { useRunBDManagerChat, type BDChatMessage } from "@/hooks/useRunBDManagerChat";

type TeamMetrics = {
  dhs_submission_rate?: number;
  eod_submission_rate?: number;
  avg_follow_ups_per_day?: number;
  avg_calls_per_day?: number;
  avg_meetings_per_week?: number;
  goals_on_track_percentage?: number;
  total_upwork_proposals?: number;
  total_upwork_wins?: number;
  total_tasks_completed?: number;
  total_hours_logged?: number;
  week_over_week_comparison?: {
    dhs_change?: string;
    eod_change?: string;
    upwork_change?: string;
    tasks_change?: string;
  };
};

type CoachingRecommendation = {
  priority?: string;
  rep_name?: string;
  issue?: string;
  suggested_action?: string;
  timeline?: string;
};

type WigAgenda = {
  wins?: string[];
  metrics_review?: Array<{ metric: string; actual: number; target: number; status: string; trend?: string }>;
  progress_vs_goals?: Array<{ goal_title: string; owner: string; progress_percentage: number; status: string; note?: string }>;
  action_items?: Array<{ task: string; owner: string; deadline: string; success_criteria: string }>;
};

type BDWeeklyReport = {
  id: string;
  week_start_date: string;
  week_end_date: string;
  summary?: string;
  team_health_score?: number;
  rep_performance?: Array<{ rep_id: string; rep_name: string; overall_status: string }>;
  team_metrics?: TeamMetrics;
  wig_agenda?: WigAgenda;
  risk_alerts?: string[];
  coaching_recommendations?: CoachingRecommendation[];
  ai_insights?: string[];
};

const targetMetrics = {
  dhs: 100,
  eod: 95,
  goals: 80,
  upworkProposals: 10,
};

const formatTargetGap = (value?: number, target?: number) => {
  if (value == null || target == null) {
    return "—";
  }
  const diff = value - target;
  const sign = diff >= 0 ? "+" : "-";
  return `${sign}${Math.abs(diff).toFixed(1)} pts`;
};

const getWinRate = (wins?: number, proposals?: number) => {
  if (wins == null || proposals == null || proposals === 0) {
    return "—";
  }
  return `${((wins / proposals) * 100).toFixed(1)}%`;
};

export default function BDManagerReports() {
  const { toast } = useToast();
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatMessages, setChatMessages] = useState<BDChatMessage[]>([]);
  
  const { askQuestion, isLoading: isChatLoading, error: chatError } = useRunBDManagerChat({
    weekStartDate: selectedWeek || undefined,
  });

  const handleAskQuestion = async (question: string, mode: "quick" | "deep") => {
    // Add user message immediately
    const userMessage: BDChatMessage = {
      role: "user",
      content: question,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, userMessage]);

    // Get AI response
    const response = await askQuestion(question, chatMessages, mode);
    
    if (response) {
      const assistantMessage: BDChatMessage = {
        role: "assistant",
        content: response.summary,
        timestamp: new Date(),
        structuredData: response,
      };
      setChatMessages((prev) => [...prev, assistantMessage]);
    } else if (chatError) {
      toast({
        title: "Error",
        description: chatError,
        variant: "destructive",
      });
    }
  };

  const handleQuickInsight = (question: string) => {
    handleAskQuestion(question, "quick");
  };

  const reportsQuery = useQuery({
    queryKey: ["bd-weekly-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bd_weekly_reports")
        .select("*")
        .eq("report_status", "published")
        .order("week_start_date", { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        week_start_date: row.week_start_date,
        week_end_date: row.week_end_date,
        summary: row.summary ?? undefined,
        team_health_score: row.team_health_score ?? undefined,
        rep_performance: Array.isArray(row.rep_performance) ? row.rep_performance as BDWeeklyReport["rep_performance"] : undefined,
        team_metrics: (row.team_metrics as TeamMetrics) ?? undefined,
        wig_agenda: (row.wig_agenda as WigAgenda) ?? undefined,
        risk_alerts: row.risk_alerts ?? undefined,
        coaching_recommendations: Array.isArray(row.coaching_recommendations) ? row.coaching_recommendations as CoachingRecommendation[] : undefined,
        ai_insights: row.ai_insights ?? undefined,
      })) as BDWeeklyReport[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const reportQuery = useQuery({
    queryKey: ["bd-weekly-report", selectedWeek],
    queryFn: async () => {
      if (!selectedWeek) return null;

      const { data, error } = await supabase
        .from("bd_weekly_reports")
        .select("*")
        .eq("week_start_date", selectedWeek)
        .single();

      if (error) throw error;
      if (!data) return null;
      return {
        id: data.id,
        week_start_date: data.week_start_date,
        week_end_date: data.week_end_date,
        summary: data.summary ?? undefined,
        team_health_score: data.team_health_score ?? undefined,
        rep_performance: Array.isArray(data.rep_performance) ? data.rep_performance as BDWeeklyReport["rep_performance"] : undefined,
        team_metrics: (data.team_metrics as TeamMetrics) ?? undefined,
        wig_agenda: (data.wig_agenda as WigAgenda) ?? undefined,
        risk_alerts: data.risk_alerts ?? undefined,
        coaching_recommendations: Array.isArray(data.coaching_recommendations) ? data.coaching_recommendations as CoachingRecommendation[] : undefined,
        ai_insights: data.ai_insights ?? undefined,
      } as BDWeeklyReport;
    },
    enabled: !!selectedWeek,
  });

  const agentQuery = useQuery({
    queryKey: ["ai-agent", "bd-manager-weekly-review"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_agents")
        .select("id, name, description, category")
        .eq("slug", "bd-manager-weekly-review")
        .single();

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    if (!selectedWeek && reportsQuery.data?.length) {
      setSelectedWeek(reportsQuery.data[0].week_start_date);
    }
  }, [reportsQuery.data, selectedWeek]);

  const selectedReport = reportQuery.data;
  const teamMetrics = selectedReport?.team_metrics;

  const summaryPillars = useMemo(() => {
    const insights: string[] = [];
    if (selectedReport?.ai_insights?.length) {
      insights.push(...selectedReport.ai_insights.slice(0, 3));
    }
    if (selectedReport?.risk_alerts?.length) {
      insights.push(...selectedReport.risk_alerts.slice(0, 2));
    }
    return insights;
  }, [selectedReport]);

  const formatPercent = (value?: number, fallback = "—") => (value != null ? `${value.toFixed(1)}%` : fallback);
  const formatNumber = (value?: number, fallback = "—") => (value != null ? value.toLocaleString() : fallback);
  const getTrendLabel = (trend?: string) => (trend ? trend.replace(/_/g, " ") : "steady");

  const handleGenerateReport = async () => {
    if (!selectedWeek || isGenerating) return;

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("bd-manager-weekly-review", {
        body: {
          weekStartDate: selectedWeek,
          forceRerun: true,
        },
      });

      if (error) throw error;

      toast({
        title: "Report generation started",
        description: data?.message || "The BD Manager agent is analyzing the week.",
      });

      await reportsQuery.refetch();
      await reportQuery.refetch();
    } catch (err: any) {
      toast({
        title: "Report generation failed",
        description: err?.message || "Unable to queue the report.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    selectedReport?.rep_performance?.forEach((rep) => {
      counts[rep.overall_status] = (counts[rep.overall_status] || 0) + 1;
    });
    return counts;
  }, [selectedReport]);

  const weekTitle = selectedReport
    ? `Week of ${selectedReport.week_start_date} → ${selectedReport.week_end_date}`
    : "Select a week to view details";

  if (reportsQuery.isLoading) {
    return (
      <section className="space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">BD Intelligence</p>
          <h1 className="text-3xl font-bold">BD Manager Weekly Reports</h1>
        </header>
        <Card className="flex items-center justify-center p-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading reports...</p>
          </div>
        </Card>
      </section>
    );
  }

  if (reportsQuery.error) {
    return (
      <section className="space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">BD Intelligence</p>
          <h1 className="text-3xl font-bold">BD Manager Weekly Reports</h1>
        </header>
        <Card className="p-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="rounded-full bg-destructive/10 p-3">
              <Activity className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Failed to load reports</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {reportsQuery.error.message || "Unable to fetch BD weekly reports. Please try again."}
              </p>
            </div>
            <Button onClick={() => reportsQuery.refetch()} className="mt-2">
              Try Again
            </Button>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">BD Intelligence</p>
          <h1 className="text-3xl font-bold">BD Manager Weekly Reports</h1>
          <p className="text-sm text-muted-foreground">{weekTitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedReport?.team_health_score != null && (
            <div className="flex flex-col items-center rounded-lg border border-border px-4 py-2 text-center">
              <span className="text-2xl font-semibold text-foreground">{selectedReport.team_health_score}/100</span>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">team health</span>
            </div>
          )}
          <Button
            onClick={handleGenerateReport}
            disabled={!selectedWeek || isGenerating}
            className="flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Rerun BD Manager Agent"
            )}
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold">Select report week</CardTitle>
              <p className="text-sm text-muted-foreground">
                Pick the week you want to drill into. Reports stay available for review once published.
              </p>
            </div>
            <div className="w-56">
              <Select 
                value={selectedWeek ?? ""} 
                onValueChange={(value) => setSelectedWeek(value || null)}
                disabled={!reportsQuery.data?.length}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    reportsQuery.isLoading 
                      ? "Loading…" 
                      : reportsQuery.data?.length 
                        ? "Select a week…" 
                        : "No reports yet"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {reportsQuery.data?.length ? (
                    reportsQuery.data.map((report) => (
                      <SelectItem key={report.id} value={report.week_start_date}>
                        Week of {report.week_start_date}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="empty" disabled>
                      No reports available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {reportQuery.isLoading ? (
        <Card className="flex items-center justify-center p-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading report details...</p>
          </div>
        </Card>
      ) : selectedReport ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-base font-semibold">DHS Consistency</CardTitle>
                  </div>
                  <Badge variant="outline">Target: 100%</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm text-muted-foreground">Submission rate</p>
                  <p className="text-xl font-semibold">{formatPercent(teamMetrics?.dhs_submission_rate)}</p>
                </div>
                <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                  <span>Gap to target</span>
                  <span>{formatTargetGap(teamMetrics?.dhs_submission_rate, targetMetrics.dhs)}</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Follow-ups/day</p>
                    <p className="font-semibold">{formatNumber(teamMetrics?.avg_follow_ups_per_day)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Calls/day</p>
                    <p className="font-semibold">{formatNumber(teamMetrics?.avg_calls_per_day)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Meetings/week</p>
                    <p className="font-semibold">{formatNumber(teamMetrics?.avg_meetings_per_week)}</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Trend: {getTrendLabel(teamMetrics?.week_over_week_comparison?.dhs_change)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-emerald-500" />
                    <CardTitle className="text-base font-semibold">EOD Signal</CardTitle>
                  </div>
                  <Badge variant="outline">Target: 95%</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm text-muted-foreground">Submission rate</p>
                  <p className="text-xl font-semibold">{formatPercent(teamMetrics?.eod_submission_rate)}</p>
                </div>
                <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                  <span>Gap to target</span>
                  <span>{formatTargetGap(teamMetrics?.eod_submission_rate, targetMetrics.eod)}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Hours logged</p>
                    <p className="font-semibold">{formatNumber(teamMetrics?.total_hours_logged)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Tasks completed</p>
                    <p className="font-semibold">{formatNumber(teamMetrics?.total_tasks_completed)}</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Trend: {getTrendLabel(teamMetrics?.week_over_week_comparison?.eod_change)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-violet-500" />
                    <CardTitle className="text-base font-semibold">Accountability</CardTitle>
                  </div>
                  <Badge variant="outline">Goals</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm text-muted-foreground">Goals on track</p>
                  <p className="text-xl font-semibold">
                    {formatPercent(teamMetrics?.goals_on_track_percentage)}
                  </p>
                </div>
                <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                  <span>Gap to target</span>
                  <span>{formatTargetGap(teamMetrics?.goals_on_track_percentage, targetMetrics.goals)}</span>
                </div>
                {selectedReport?.wig_agenda?.progress_vs_goals?.length ? (
                  <div className="space-y-2 text-sm">
                    {selectedReport.wig_agenda.progress_vs_goals.slice(0, 3).map((goal) => (
                      <div key={`${goal.goal_title}-${goal.owner}`} className="rounded-md bg-muted p-2">
                        <div className="font-medium">{goal.goal_title}</div>
                        <div className="text-xs text-muted-foreground">
                          {goal.owner} • {goal.progress_percentage}% • {goal.status.replace("_", " ")}
                        </div>
                        {goal.note && <p className="text-xs text-muted-foreground">{goal.note}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No quarterly progress details available.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-orange-500" />
                    <CardTitle className="text-base font-semibold">Upwork & Pipeline</CardTitle>
                  </div>
                  <Badge variant="outline">Sales Ops</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Proposals</p>
                    <p className="font-semibold">{formatNumber(teamMetrics?.total_upwork_proposals)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Wins</p>
                    <p className="font-semibold">{formatNumber(teamMetrics?.total_upwork_wins)}</p>
                  </div>
                </div>
                <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                  <span>Gap to target</span>
                  <span>{formatTargetGap(teamMetrics?.total_upwork_proposals, targetMetrics.upworkProposals)}</span>
                </div>
                <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                  <span>Win rate</span>
                  <span>{getWinRate(teamMetrics?.total_upwork_wins, teamMetrics?.total_upwork_proposals)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Source: Upwork data snapshot pulled from the BD Manager agent JSON report.
                </div>
                <div className="text-xs text-muted-foreground">
                  Trend: {getTrendLabel(teamMetrics?.week_over_week_comparison?.upwork_change)}
                </div>
              </CardContent>
            </Card>
          </div>

          {selectedReport?.wig_agenda && (selectedReport.wig_agenda.wins?.length || selectedReport.wig_agenda.action_items?.length) ? (
            <div className="grid gap-4 md:grid-cols-2">
              {selectedReport.wig_agenda.wins?.length ? (
                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      Weekly Wins
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Key accomplishments from this week
                    </p>
                  </CardHeader>
                  <CardContent className="p-4">
                    <ul className="space-y-2 text-sm">
                      {selectedReport.wig_agenda.wins.map((win, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-green-500 font-bold mt-0.5">✓</span>
                          <span>{win}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ) : null}

              {selectedReport.wig_agenda.action_items?.length ? (
                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-blue-500" />
                      Action Items
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Priority tasks and next steps
                    </p>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {selectedReport.wig_agenda.action_items.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="rounded-md bg-muted p-3 text-sm">
                          <div className="font-medium">{item.task}</div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{item.owner}</span>
                            <span>•</span>
                            <span>{item.deadline}</span>
                          </div>
                          {item.success_criteria && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Success: {item.success_criteria}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="p-4">
                <CardTitle className="text-lg font-semibold">Executive Summary</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedReport.summary || "No executive summary available yet."}
                </p>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                {summaryPillars.length ? (
                  <ul className="space-y-2 text-sm">
                    {summaryPillars.map((insight, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No additional context captured for this report yet.
                  </p>
                )}
                <div className="space-y-2">
                  {selectedReport.risk_alerts?.length ? (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
                        Risks
                      </p>
                      <ul className="space-y-1 text-sm text-destructive">
                        {selectedReport.risk_alerts.slice(0, 3).map((risk, idx) => (
                          <li key={idx}>• {risk}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}

                  {selectedReport.coaching_recommendations?.length ? (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Coaching focus
                      </p>
                      <ul className="space-y-1 text-sm">
                        {selectedReport.coaching_recommendations.slice(0, 3).map((rec, idx) => (
                          <li key={idx}>
                            <span className="font-semibold">{rec.rep_name || "Team"}</span>:{" "}
                            {rec.issue || rec.suggested_action}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-lg font-semibold">Rep Health Snapshot</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Status breakdown from the most recent AI analysis.
                </p>
              </CardHeader>
              <CardContent className="space-y-2 p-4 text-sm">
                {["excellent", "on_track", "needs_support", "at_risk"].map((status) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="capitalize">{status.replace("_", " ")}</span>
                    <span className="font-semibold">{statusCounts[status] ?? 0}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      ) : !reportsQuery.data || reportsQuery.data.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-full bg-primary/10 p-4">
              <ClipboardList className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">No reports available yet</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md">
                The BD Manager agent hasn't generated any weekly reports yet. Reports are automatically generated every Monday at 9 AM, or you can trigger one manually.
              </p>
            </div>
            {agentQuery.data && (
              <Button onClick={handleGenerateReport} disabled={isGenerating} className="mt-2">
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  "Generate First Report"
                )}
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground text-center">
            Select a published week from the dropdown above to view detailed analytics.
          </p>
        </Card>
      )}

      <Card className="flex flex-col h-[500px]">
        <CardHeader className="p-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">Chat with BD Manager Agent</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Ask questions about team performance, individual reps, or get coaching recommendations.
          </p>
          {selectedWeek && (
            <Badge variant="outline" className="w-fit mt-2">
              <Calendar className="h-3 w-3 mr-1" />
              Context: Week of {selectedWeek}
            </Badge>
          )}
        </CardHeader>
        
        <div className="flex-1 flex flex-col min-h-0">
          {chatMessages.length === 0 ? (
            <div className="flex-1 flex flex-col">
              <BDManagerChatMessages messages={[]} weekContext={selectedWeek || undefined} />
              <QuickBDInsightCards onSelectQuestion={handleQuickInsight} />
            </div>
          ) : (
            <BDManagerChatMessages messages={chatMessages} weekContext={selectedWeek || undefined} />
          )}
        </div>
        
        <BDManagerChatInput onAsk={handleAskQuestion} isLoading={isChatLoading} />
      </Card>
    </section>
  );
}

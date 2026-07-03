import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  JOB_LEAD_SOURCE_LABELS,
  LEAD_TYPE_LABELS,
  resolveJobLeadSource,
  type JobLeadSource,
} from "@/features/upwork-jobs/constants/sources";

const CHART_COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#8b5cf6",
  "#f97316",
  "#64748b",
];

const MINUTES_SAVED_PER_ANALYSIS = 15;
const MINUTES_SAVED_PER_COMPANY_REPORT = 20;

export interface JobBoardDashboardData {
  totalLeads: number;
  analyzedCount: number;
  companyReportsCount: number;
  estimatedHoursSaved: number;
  sourceBreakdown: Array<{ name: string; value: number; fill: string }>;
  leadTypeBreakdown: Array<{ name: string; value: number; fill: string }>;
  jobTypeBreakdown: Array<{ name: string; value: number; fill: string }>;
  recommendationBreakdown: Array<{ name: string; value: number; fill: string }>;
  leadsOverTime: Array<{ date: string; leads: number }>;
  weeklyComparison: Array<{
    week: string;
    imported: number;
    analyzed: number;
  }>;
  aiVsManualTasks: Array<{
    task: string;
    manual: number;
    aiAssisted: number;
  }>;
}

function countByKey<T extends string>(
  items: Array<T | null | undefined>,
  labels: Record<string, string>,
  fallback = "Unknown",
): Array<{ name: string; value: number; fill: string }> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = item?.trim() || fallback;
    const label = labels[key] ?? key;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], index) => ({
      name,
      value,
      fill: CHART_COLORS[index % CHART_COLORS.length],
    }));
}

function groupByDay(
  timestamps: string[],
  days = 30,
): Array<{ date: string; leads: number }> {
  const end = startOfDay(new Date());
  const start = subDays(end, days - 1);
  const interval = eachDayOfInterval({ start, end });

  const counts = new Map<string, number>();
  for (const day of interval) {
    counts.set(format(day, "MMM d"), 0);
  }

  for (const ts of timestamps) {
    const date = startOfDay(new Date(ts));
    if (date < start || date > end) continue;
    const key = format(date, "MMM d");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([date, leads]) => ({ date, leads }));
}

function groupWeeklyComparison(
  leadDates: string[],
  analysisDates: string[],
): Array<{ week: string; imported: number; analyzed: number }> {
  const weeks = 6;
  const result: Array<{ week: string; imported: number; analyzed: number }> = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const weekEnd = subDays(startOfDay(new Date()), i * 7);
    const weekStart = subDays(weekEnd, 6);
    const label = `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d")}`;

    const imported = leadDates.filter((ts) => {
      const d = startOfDay(new Date(ts));
      return d >= weekStart && d <= weekEnd;
    }).length;

    const analyzed = analysisDates.filter((ts) => {
      const d = startOfDay(new Date(ts));
      return d >= weekStart && d <= weekEnd;
    }).length;

    result.push({ week: label, imported, analyzed });
  }

  return result;
}

export function useJobBoardDashboard() {
  return useQuery({
    queryKey: ["job-board-dashboard"],
    queryFn: async (): Promise<JobBoardDashboardData> => {
      const [jobsResult, analysisResult, companyResult] = await Promise.all([
        supabase
          .from("upwork_jobs")
          .select("source, lead_type, job_type, created_at, scraped_at, job_url"),
        supabase
          .from("opportunity_analysis")
          .select("recommendation, created_at"),
        supabase
          .from("company_intelligence_reports")
          .select("id", { count: "exact", head: true }),
      ]);

      if (jobsResult.error) throw jobsResult.error;
      if (analysisResult.error) throw analysisResult.error;
      if (companyResult.error) throw companyResult.error;

      const jobs = jobsResult.data ?? [];
      const analyses = analysisResult.data ?? [];
      const companyReportsCount = companyResult.count ?? 0;
      const analyzedCount = analyses.length;

      const resolvedSources = jobs.map((job) => {
        const resolved = resolveJobLeadSource(job.source, job.job_url);
        return resolved
          ? JOB_LEAD_SOURCE_LABELS[resolved as JobLeadSource]
          : job.source || "Other";
      });

      const leadTimestamps = jobs.map(
        (job) => job.scraped_at ?? job.created_at,
      );
      const analysisTimestamps = analyses.map((a) => a.created_at);

      const estimatedMinutes =
        analyzedCount * MINUTES_SAVED_PER_ANALYSIS +
        companyReportsCount * MINUTES_SAVED_PER_COMPANY_REPORT;

      const recommendationLabels: Record<string, string> = {
        PURSUE: "Pursue",
        REVIEW: "Review",
        IGNORE: "Ignore",
      };

      return {
        totalLeads: jobs.length,
        analyzedCount,
        companyReportsCount,
        estimatedHoursSaved: Math.round((estimatedMinutes / 60) * 10) / 10,
        sourceBreakdown: countByKey(resolvedSources, {}),
        leadTypeBreakdown: countByKey(
          jobs.map((j) => j.lead_type),
          LEAD_TYPE_LABELS,
        ),
        jobTypeBreakdown: countByKey(
          jobs.map((j) => j.job_type),
          { Hourly: "Hourly", "Fixed-price": "Fixed-price" },
        ),
        recommendationBreakdown: countByKey(
          analyses.map((a) => a.recommendation),
          recommendationLabels,
        ),
        leadsOverTime: groupByDay(leadTimestamps),
        weeklyComparison: groupWeeklyComparison(leadTimestamps, analysisTimestamps),
        aiVsManualTasks: [
          {
            task: "Lead screening",
            manual: Math.max(jobs.length - analyzedCount, 0),
            aiAssisted: analyzedCount,
          },
          {
            task: "Company research",
            manual: Math.max(jobs.length - companyReportsCount, 0),
            aiAssisted: companyReportsCount,
          },
          {
            task: "Fit assessment",
            manual: Math.max(jobs.length - analyzedCount, 0),
            aiAssisted: analyzedCount,
          },
        ],
      };
    },
    staleTime: 60_000,
  });
}

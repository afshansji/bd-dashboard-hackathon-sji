import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listFeedbackReports } from "@/features/feedback/api";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { FeedbackStatsCards } from "@/components/feedback/FeedbackStatsCards";
import { FeedbackQuickSubmit } from "@/components/feedback/FeedbackQuickSubmit";
import { FeedbackStatusOverview } from "@/components/feedback/FeedbackStatusOverview";
import { FeedbackListSection } from "@/components/feedback/FeedbackListSection";
import type { FeedbackStatus } from "@/features/feedback/api";

const STATUS_ORDER: FeedbackStatus[] = ["open", "in_review", "resolved", "closed"];

export default function FeedbackDashboard() {
  const { enabled: feedbackEnabled, isLoading: flagLoading } = useFeatureFlag("feedback_enabled");

  const feedbackQuery = useQuery({
    queryKey: ["feedback-dashboard"],
    queryFn: () => listFeedbackReports({ includeClosed: true }),
    enabled: feedbackEnabled,
  });

  const items = feedbackQuery.data?.items ?? [];

  const stats = useMemo(() => {
    const bugs = items.filter((item) => item.type === "bug");
    const features = items.filter((item) => item.type === "feature");
    const openBugs = bugs.filter((item) => item.status === "open");
    const openFeatures = features.filter((item) => item.status === "open");
    const inProgress = items.filter((item) => item.status === "in_review");
    const resolved = items.filter((item) => item.status === "resolved");

    return {
      openBugs: openBugs.length,
      openBugHighPriority: openBugs.filter((item) => item.priority === "high").length,
      openFeatures: openFeatures.length,
      totalFeatures: features.length,
      inProgress: inProgress.length,
      resolved: resolved.length,
      bugSummary: {
        label: "Bug Reports",
        counts: STATUS_ORDER.reduce((acc, status) => {
          acc[status] = bugs.filter((item) => item.status === status).length;
          return acc;
        }, {} as Record<FeedbackStatus, number>),
        total: bugs.length,
      },
      featureSummary: {
        label: "Feature Requests",
        counts: STATUS_ORDER.reduce((acc, status) => {
          acc[status] = features.filter((item) => item.status === status).length;
          return acc;
        }, {} as Record<FeedbackStatus, number>),
        total: features.length,
      },
    };
  }, [items]);

  if (!flagLoading && !feedbackEnabled) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Feedback module is disabled.
      </div>
    );
  }

  if (feedbackQuery.isLoading) {
    return <div className="py-12 text-center text-muted-foreground">Loading feedback…</div>;
  }

  if (feedbackQuery.isError) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Unable to load feedback right now.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Feedback</h1>
        <p className="text-muted-foreground">
          One shared view for the team to triage bugs, feature requests, and customer insights.
        </p>
      </div>

      <FeedbackStatsCards
        openBugs={stats.openBugs}
        openBugHighPriority={stats.openBugHighPriority}
        openFeatures={stats.openFeatures}
        totalFeatures={stats.totalFeatures}
        inProgress={stats.inProgress}
        resolved={stats.resolved}
      />

      <FeedbackQuickSubmit />

      <FeedbackStatusOverview
        bugSummary={stats.bugSummary}
        featureSummary={stats.featureSummary}
      />

      <FeedbackListSection items={items} />
    </div>
  );
}

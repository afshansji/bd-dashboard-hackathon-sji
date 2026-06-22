import { useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { StageTabContent } from "@/components/business-opportunity/StageTabContent";
import BusinessOpportunitiesOverview from "@/components/business-opportunity/BusinessOpportunitiesOverview";
import { OptimizedDealAnalytics } from "@/components/business-opportunity/OptimizedDealAnalytics";
import { useBODeals } from "@/hooks/useBusinessOpportunityDeals";
import { supabase } from "@/integrations/supabase/client";
import type { DealStage } from "@/types/business-opportunities";
import { format } from "date-fns";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Download,
  Grid,
  Loader2,
  Users,
  Search,
  CheckCircle,
  Calculator,
  FileText,
  FileSpreadsheet,
  Trophy,
  ThumbsUp,
  XCircle,
  Table as TableIcon,
} from "lucide-react";

// ── Stage tab theme types ─────────────────────────────────────────────

type StageTabTheme = {
  trigger: string;
  iconWrapper: string;
  badge: string;
};

type StageTabConfig = {
  value: DealStage | "all";
  label: string;
  icon: LucideIcon;
  theme: StageTabTheme;
};

const STAGE_TAB_CONFIG: StageTabConfig[] = [
  {
    value: "all",
    label: "All",
    icon: TableIcon,
    theme: {
      trigger: "border-blue-200/70 bg-blue-50 text-blue-900 hover:border-blue-300 data-[state=active]:border-blue-400 data-[state=active]:bg-white dark:bg-blue-950/40 dark:text-blue-200 dark:data-[state=active]:bg-blue-950",
      iconWrapper: "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300",
      badge: "bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    },
  },
  {
    value: "lead",
    label: "Lead",
    icon: Users,
    theme: {
      trigger: "border-pink-200/70 bg-pink-50 text-pink-900 hover:border-pink-300 data-[state=active]:border-pink-400 data-[state=active]:bg-white dark:bg-pink-950/40 dark:text-pink-200 dark:data-[state=active]:bg-pink-950",
      iconWrapper: "bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-300",
      badge: "bg-pink-200 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
    },
  },
  {
    value: "discovery",
    label: "Discovery",
    icon: Search,
    theme: {
      trigger: "border-purple-200/70 bg-purple-50 text-purple-900 hover:border-purple-300 data-[state=active]:border-purple-400 data-[state=active]:bg-white dark:bg-purple-950/40 dark:text-purple-200 dark:data-[state=active]:bg-purple-950",
      iconWrapper: "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300",
      badge: "bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    },
  },
  {
    value: "qualified",
    label: "Qualified",
    icon: CheckCircle,
    theme: {
      trigger: "border-indigo-200/70 bg-indigo-50 text-indigo-900 hover:border-indigo-300 data-[state=active]:border-indigo-400 data-[state=active]:bg-white dark:bg-indigo-950/40 dark:text-indigo-200 dark:data-[state=active]:bg-indigo-950",
      iconWrapper: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300",
      badge: "bg-indigo-200 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    },
  },
  {
    value: "estimation",
    label: "Estimation",
    icon: Calculator,
    theme: {
      trigger: "border-slate-200/70 bg-slate-50 text-slate-900 hover:border-slate-300 data-[state=active]:border-slate-400 data-[state=active]:bg-white dark:bg-slate-950/40 dark:text-slate-200 dark:data-[state=active]:bg-slate-950",
      iconWrapper: "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300",
      badge: "bg-slate-200 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
    },
  },
  {
    value: "proposal",
    label: "Proposal",
    icon: FileText,
    theme: {
      trigger: "border-yellow-200/70 bg-yellow-50 text-yellow-900 hover:border-yellow-300 data-[state=active]:border-yellow-400 data-[state=active]:bg-white dark:bg-yellow-950/40 dark:text-yellow-200 dark:data-[state=active]:bg-yellow-950",
      iconWrapper: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300",
      badge: "bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    },
  },
];

const VALID_STAGE_VALUES = ["all", "lead", "discovery", "qualified", "estimation", "proposal"] as const;
type ValidStageValue = (typeof VALID_STAGE_VALUES)[number];

const isDealStageValue = (value: string | null): value is ValidStageValue => {
  if (!value) return false;
  return VALID_STAGE_VALUES.includes(value as ValidStageValue);
};

type StageCounts = Record<string, number>;
type DealStageCountRow = { stage: string | null; count: number | string | null };

const safeFormatDate = (value?: string | null, fmt?: string) => {
  if (!value) return "—";
  try {
    return format(new Date(value), fmt || "MMM d, yyyy");
  } catch {
    return "—";
  }
};

export default function BusinessOpportunities() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mainTab = searchParams.get("tab") || "overview";
  const rawStage = searchParams.get("stage");
  const stageTab: DealStage | "all" =
    mainTab === "pipeline" && rawStage && isDealStageValue(rawStage)
      ? (rawStage as DealStage | "all")
      : "all";
  const archiveStage = (searchParams.get("archive") || "won") as DealStage;
  const viewMode = (searchParams.get("view") || "table") as "table" | "card";

  const numberFormatter = useMemo(() => new Intl.NumberFormat("en-US"), []);

  // ── Fetch all deals for analytics and CSV export ──
  const { data: allDealsData } = useBODeals({
    pageSize: 10000,
    page: 1,
    sortBy: "created_at",
    sortOrder: "desc",
  });

  // ── Stage counts via RPC ──
  const {
    data: stageCounts = {},
    isLoading: isLoadingStageCounts,
  } = useQuery<StageCounts>({
    queryKey: ["deal-stage-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_deal_stage_counts");
      if (error) throw new Error(error.message);
      const counts =
        (data as DealStageCountRow[] | null)?.reduce<StageCounts>((acc, row) => {
          const key = (row.stage ?? "unknown").toLowerCase();
          acc[key] = Number(row.count) || 0;
          return acc;
        }, {}) ?? {};
      return counts;
    },
    staleTime: 0,
    gcTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 30,
    refetchOnWindowFocus: true,
  });

  // ── Active pipeline count ──
  const ACTIVE_STAGES = ["lead", "discovery", "qualified", "estimation", "proposal"];
  const { data: activePipelineCount = 0, isLoading: isLoadingActivePipeline } = useQuery<number>({
    queryKey: ["deals-active-pipeline-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("deals")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null)
        .in("stage", ACTIVE_STAGES);
      if (error) throw new Error(error.message);
      return count || 0;
    },
    staleTime: 1000 * 60 * 5,
  });

  // ── Closed deals count ──
  const CLOSED_STAGES = ["won", "lost", "accepted"];
  const { data: closedDealsCount = 0, isLoading: isLoadingClosedDeals } = useQuery<number>({
    queryKey: ["deals-closed-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("deals")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null)
        .in("stage", CLOSED_STAGES);
      if (error) throw new Error(error.message);
      return count || 0;
    },
    staleTime: 1000 * 60 * 5,
  });

  // ── Real-time subscription ──
  useEffect(() => {
    const channel = supabase
      .channel("deals_changes_bo")
      .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, () => {
        queryClient.invalidateQueries({ queryKey: ["deal-stage-counts"] });
        queryClient.invalidateQueries({ queryKey: ["deals-active-pipeline-count"] });
        queryClient.invalidateQueries({ queryKey: ["deals-closed-count"] });
        queryClient.invalidateQueries({ queryKey: ["bo-deals"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // ── URL setters ──
  const setMainTab = useCallback(
    (tab: string) => {
      setSearchParams((prev) => {
        prev.set("tab", tab);
        return prev;
      });
    },
    [setSearchParams]
  );

  const setStageTab = useCallback(
    (stage: string) => {
      setSearchParams((prev) => {
        prev.set("stage", stage);
        return prev;
      });
    },
    [setSearchParams]
  );

  const setArchiveStage = useCallback(
    (stage: string) => {
      setSearchParams((prev) => {
        prev.set("archive", stage);
        return prev;
      });
    },
    [setSearchParams]
  );

  const setViewMode = useCallback(
    (mode: "table" | "card") => {
      setSearchParams((prev) => {
        prev.set("view", mode);
        return prev;
      });
    },
    [setSearchParams]
  );

  const handleViewDetails = (slug: string) => {
    navigate(`/business-opportunities/deals/${slug}`);
  };

  const handleExportCSV = () => {
    const deals = allDealsData?.deals;
    if (!deals?.length) return;
    const headers = ["Name", "Stage", "Value", "Owner", "Created"];
    const rows = deals.map((d) => [
      d.deal_name || d.title || "",
      d.stage,
      String(d.value ?? d.amount ?? 0),
      d.actual_deal_owner_name || d.owner || "",
      d.created_at,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deals-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Build owners list for StageTabContent
  const owners = (allDealsData?.deals || [])
    .filter((d) => d.owner)
    .map((d) => ({
      owner: d.owner || "",
      actual_deal_owner_name: d.actual_deal_owner_name || undefined,
    }));

  return (
    <div className="py-6 space-y-6">
      <PageHeader
        title="Business Opportunities"
        description="Manage your deal pipeline, track progress, and analyze performance."
        actions={
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        }
      />

      <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-6">
        {/* ── Rich Main Tabs ── */}
        <TabsList className="flex h-auto w-full flex-wrap gap-2 rounded-none border-b border-border/60 bg-transparent p-0 text-sm text-muted-foreground">
          <TabsTrigger
            value="overview"
            className="inline-flex min-w-[140px] items-center gap-2 rounded-md border border-transparent px-4 py-2 font-semibold transition hover:text-foreground data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <Grid className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="pipeline"
            className="inline-flex flex-1 min-w-[200px] items-center gap-3 rounded-md border border-transparent px-4 py-2 text-left font-semibold transition hover:text-foreground data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-blue-100 p-1.5 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                <TableIcon className="h-4 w-4" />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold">Active Pipeline</p>
                <p className="text-xs text-muted-foreground">Open opportunities</p>
              </div>
            </div>
            <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              {isLoadingActivePipeline ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                numberFormatter.format(activePipelineCount)
              )}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="archive"
            className="inline-flex min-w-[180px] items-center gap-3 rounded-md border border-transparent px-4 py-2 text-left font-semibold transition hover:text-foreground data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-gray-100 p-1.5 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                <Trophy className="h-4 w-4" />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold">Archive</p>
                <p className="text-xs text-muted-foreground">Won & Lost</p>
              </div>
            </div>
            <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              {isLoadingClosedDeals ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                numberFormatter.format(closedDealsCount)
              )}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="inline-flex min-w-[160px] items-center gap-2 rounded-md border border-transparent px-4 py-2 font-semibold transition hover:text-foreground data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ── */}
        <TabsContent value="overview" className="mt-6">
          <BusinessOpportunitiesOverview />
        </TabsContent>

        {/* ── Pipeline Tab with colored stage pills ── */}
        <TabsContent value="pipeline" className="mt-6 space-y-4">
          <Tabs value={stageTab} onValueChange={setStageTab} className="space-y-4">
            <div className="w-full overflow-x-auto pb-1 sm:overflow-visible sm:pb-0">
              <TabsList className="flex h-auto w-max min-w-full flex-nowrap gap-2 rounded-none bg-transparent p-0 sm:w-full sm:min-w-0 sm:flex-wrap">
                {STAGE_TAB_CONFIG.map((stage) => {
                  const IconComponent = stage.icon;
                  return (
                    <TabsTrigger
                      key={stage.value}
                      value={stage.value}
                      className={`inline-flex h-10 min-w-[140px] items-center gap-2 rounded-full border px-4 text-sm font-semibold transition ${stage.theme.trigger}`}
                    >
                      <div
                        className={`hidden h-6 w-6 items-center justify-center rounded-full sm:flex ${stage.theme.iconWrapper}`}
                      >
                        <IconComponent className="h-3.5 w-3.5" />
                      </div>
                      <span>{stage.label}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${stage.theme.badge}`}
                      >
                        {isLoadingStageCounts || isLoadingActivePipeline ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          numberFormatter.format(
                            stage.value === "all"
                              ? activePipelineCount
                              : stageCounts[stage.value] ?? 0
                          )
                        )}
                      </span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            {STAGE_TAB_CONFIG.map((stage) => (
              <TabsContent key={stage.value} value={stage.value} className="space-y-6">
                <StageTabContent
                  stage={stage.value}
                  stageLabel={stage.label}
                  viewMode={viewMode}
                  safeFormatDate={safeFormatDate}
                  onViewDetails={handleViewDetails}
                  owners={owners}
                  onViewModeChange={setViewMode}
                />
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>

        {/* ── Archive Tab with colored pills ── */}
        <TabsContent value="archive" className="mt-6 space-y-4">
          <Tabs value={archiveStage} onValueChange={setArchiveStage} className="space-y-4">
            <TabsList className="flex h-auto w-max min-w-full flex-nowrap gap-2 rounded-none bg-transparent p-0 sm:w-full sm:min-w-0 sm:flex-wrap">
              <TabsTrigger
                value="won"
                className="inline-flex h-10 min-w-[140px] items-center gap-2 rounded-full border px-4 text-sm font-semibold transition border-green-200/70 bg-green-50 text-green-900 hover:border-green-300 data-[state=active]:border-green-400 data-[state=active]:bg-white dark:bg-green-950/40 dark:text-green-200 dark:data-[state=active]:bg-green-950"
              >
                <div className="hidden h-6 w-6 items-center justify-center rounded-full sm:flex bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300">
                  <Trophy className="h-3.5 w-3.5" />
                </div>
                <span>Won</span>
                <span className="rounded-full px-2 py-0.5 text-xs font-semibold bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200">
                  {numberFormatter.format(stageCounts["won"] ?? 0)}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="accepted"
                className="inline-flex h-10 min-w-[140px] items-center gap-2 rounded-full border px-4 text-sm font-semibold transition border-emerald-200/70 bg-emerald-50 text-emerald-900 hover:border-emerald-300 data-[state=active]:border-emerald-400 data-[state=active]:bg-white dark:bg-emerald-950/40 dark:text-emerald-200 dark:data-[state=active]:bg-emerald-950"
              >
                <div className="hidden h-6 w-6 items-center justify-center rounded-full sm:flex bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300">
                  <ThumbsUp className="h-3.5 w-3.5" />
                </div>
                <span>Accepted</span>
                <span className="rounded-full px-2 py-0.5 text-xs font-semibold bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                  {numberFormatter.format(stageCounts["accepted"] ?? 0)}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="lost"
                className="inline-flex h-10 min-w-[140px] items-center gap-2 rounded-full border px-4 text-sm font-semibold transition border-red-200/70 bg-red-50 text-red-900 hover:border-red-300 data-[state=active]:border-red-400 data-[state=active]:bg-white dark:bg-red-950/40 dark:text-red-200 dark:data-[state=active]:bg-red-950"
              >
                <div className="hidden h-6 w-6 items-center justify-center rounded-full sm:flex bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300">
                  <XCircle className="h-3.5 w-3.5" />
                </div>
                <span>Lost</span>
                <span className="rounded-full px-2 py-0.5 text-xs font-semibold bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200">
                  {numberFormatter.format(stageCounts["lost"] ?? 0)}
                </span>
              </TabsTrigger>
            </TabsList>

            {(["won", "accepted", "lost"] as DealStage[]).map((s) => (
              <TabsContent key={s} value={s} className="space-y-6">
                <StageTabContent
                  stage={s}
                  stageLabel={s.charAt(0).toUpperCase() + s.slice(1)}
                  viewMode={viewMode}
                  safeFormatDate={safeFormatDate}
                  onViewDetails={handleViewDetails}
                  owners={owners}
                  onViewModeChange={setViewMode}
                />
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>

        {/* ── Analytics Tab ── */}
        <TabsContent value="analytics" className="mt-6">
          <OptimizedDealAnalytics deals={allDealsData?.deals || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

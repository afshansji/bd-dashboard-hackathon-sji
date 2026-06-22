import { useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Lightbulb, TrendingUp, DollarSign, Clock, Target, Trophy } from "lucide-react";
import { useBODealStats, useBODeals, boDealKeys } from "@/hooks/useBusinessOpportunityDeals";
import { KPICard } from "@/components/common/KPICard";
import { supabase } from "@/integrations/supabase/client";
import { formatDecimal } from "@/lib/utils";
import { OverviewSkeleton } from "./AnalyticsSkeleton";

const ACTIVE_STAGE_CONFIG: Record<string, { label: string; bgColor: string; textColor: string; icon: any }> = {
  lead: { label: "Lead", bgColor: "bg-purple-100 dark:bg-purple-950", textColor: "text-purple-700 dark:text-purple-300", icon: Briefcase },
  discovery: { label: "Discovery", bgColor: "bg-violet-100 dark:bg-violet-950", textColor: "text-violet-700 dark:text-violet-300", icon: TrendingUp },
  qualified: { label: "Qualified", bgColor: "bg-indigo-100 dark:bg-indigo-950", textColor: "text-indigo-700 dark:text-indigo-300", icon: Target },
  estimation: { label: "Estimation", bgColor: "bg-slate-100 dark:bg-slate-950", textColor: "text-slate-700 dark:text-slate-300", icon: Lightbulb },
  proposal: { label: "Proposal", bgColor: "bg-sky-100 dark:bg-sky-950", textColor: "text-sky-700 dark:text-sky-300", icon: Briefcase },
};

const CLOSED_STAGE_CONFIG: Record<string, { label: string; bgColor: string; textColor: string; icon: any }> = {
  won: { label: "Won", bgColor: "bg-green-100 dark:bg-green-950", textColor: "text-green-700 dark:text-green-300", icon: Trophy },
  accepted: { label: "Accepted", bgColor: "bg-emerald-100 dark:bg-emerald-950", textColor: "text-emerald-700 dark:text-emerald-300", icon: TrendingUp },
  lost: { label: "Lost", bgColor: "bg-red-100 dark:bg-red-950", textColor: "text-red-700 dark:text-red-300", icon: DollarSign },
};

const formatAmount = (amount: number): string => {
  if (!Number.isFinite(amount)) return "$0";
  if (Math.abs(amount) >= 1_000_000) return `$${formatDecimal(amount / 1_000_000, 2)}M`;
  if (Math.abs(amount) >= 1_000) return `$${formatDecimal(amount / 1_000, 2)}K`;
  return `$${formatDecimal(amount, 2)}`;
};

export default function BusinessOpportunitiesOverview() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: statsData, isLoading: isLoadingStats } = useBODealStats();
  const { data: allDealsData, isLoading: isLoadingAllDeals } = useBODeals({ pageSize: 10000, page: 1, sortBy: 'created_at', sortOrder: 'desc' });
  const allDealsForMetrics = allDealsData?.deals || [];

  useEffect(() => {
    const channel = supabase.channel('deals-overview-updates').on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, () => { queryClient.invalidateQueries({ queryKey: boDealKeys.stats() }); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const advancedMetrics = useMemo(() => {
    if (!allDealsForMetrics || allDealsForMetrics.length === 0) return { conversionRate: 0, avgDealVelocity: 0, mrr: 0, activePipelineValue: 0, activePipelineCount: 0, avgTimeInStage: {} as Record<string, number> };
    const successStages = ['accepted', 'won'];
    const closedStages = [...successStages, 'lost'];
    const activeStages = ['lead', 'discovery', 'qualified', 'estimation', 'proposal'];
    const closedDeals = allDealsForMetrics.filter(d => closedStages.includes(d.stage));
    const wonDeals = allDealsForMetrics.filter(d => successStages.includes(d.stage));
    const activeDeals = allDealsForMetrics.filter(d => activeStages.includes(d.stage));
    const conversionRate = closedDeals.length > 0 ? (wonDeals.length / closedDeals.length) * 100 : 0;
    const activePipelineValue = activeDeals.reduce((sum, deal) => sum + (deal.value || 0), 0);
    const dealsWithCloseDate = wonDeals.filter(d => d.expected_close_date && d.created_at);
    const avgDealVelocity = dealsWithCloseDate.length > 0 ? dealsWithCloseDate.reduce((sum, deal) => sum + (new Date(deal.expected_close_date!).getTime() - new Date(deal.created_at).getTime()) / (1000 * 60 * 60 * 24), 0) / dealsWithCloseDate.length : 0;
    const mrr = wonDeals.reduce((sum, deal) => sum + (deal.value || 0), 0) / 12;
    const avgTimeInStage: Record<string, number> = {};
    [...Object.keys(ACTIVE_STAGE_CONFIG), ...Object.keys(CLOSED_STAGE_CONFIG)].forEach(stage => {
      const stageDeals = allDealsForMetrics.filter(d => d.stage === stage && d.days_in_stage);
      avgTimeInStage[stage] = stageDeals.length > 0 ? stageDeals.reduce((sum, d) => sum + (d.days_in_stage || 0), 0) / stageDeals.length : 0;
    });
    return { conversionRate, avgDealVelocity, mrr, activePipelineValue, activePipelineCount: activeDeals.length, avgTimeInStage };
  }, [allDealsForMetrics]);

  if (isLoadingStats || isLoadingAllDeals) return <OverviewSkeleton />;

  const handleStageClick = (stage: string) => navigate(`/business-opportunities?stage=${stage}`);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Active Pipeline" value={formatAmount(advancedMetrics.activePipelineValue)} icon={DollarSign} description={`${advancedMetrics.activePipelineCount} opportunities`} />
        <KPICard label="Win Rate" value={`${formatDecimal(advancedMetrics.conversionRate, 2)}%`} icon={Target} trend={{ direction: advancedMetrics.conversionRate > 50 ? "up" : "down", value: `${formatDecimal(Math.abs(advancedMetrics.conversionRate - 50), 2)}%` }} />
        <KPICard label="Avg Deal Velocity" value={`${formatDecimal(advancedMetrics.avgDealVelocity, 0)}`} suffix=" days" icon={Clock} description="Time to close" />
        <KPICard label="Monthly Recurring Revenue" value={formatAmount(advancedMetrics.mrr)} icon={TrendingUp} description="Projected MRR" />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Active Pipeline</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Object.entries(ACTIVE_STAGE_CONFIG).map(([stage, config]) => {
            const stageStats = statsData?.byStage?.[stage];
            const Icon = config.icon;
            const avgTime = advancedMetrics.avgTimeInStage[stage];
            return (
              <Card key={stage} className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]" onClick={() => handleStageClick(stage)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{config.label}</CardTitle><div className={`p-2 rounded-lg ${config.bgColor}`}><Icon className={`h-4 w-4 ${config.textColor}`} /></div></CardHeader>
                <CardContent><div className="text-2xl font-bold">{stageStats?.count || 0}</div><p className="text-xs text-muted-foreground">{formatAmount(stageStats?.value || 0)} potential</p>{avgTime > 0 && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" /><span>~{formatDecimal(avgTime, 0)} days avg</span></div>}</CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Closed Deals Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(CLOSED_STAGE_CONFIG).map(([stage, config]) => {
            const stageStats = statsData?.byStage?.[stage];
            const Icon = config.icon;
            return (
              <Card key={stage} className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]" onClick={() => handleStageClick(stage)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{config.label}</CardTitle><div className={`p-2 rounded-lg ${config.bgColor}`}><Icon className={`h-4 w-4 ${config.textColor}`} /></div></CardHeader>
                <CardContent><div className="text-2xl font-bold">{stageStats?.count || 0}</div><p className="text-xs text-muted-foreground">{formatAmount(stageStats?.value || 0)} total</p></CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

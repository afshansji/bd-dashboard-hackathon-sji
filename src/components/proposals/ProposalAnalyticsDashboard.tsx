import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Funnel,
  FunnelChart,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { useProposalAnalytics } from "@/hooks/useProposalAnalytics";
import { ProposalMetricsCard } from "./ProposalMetricsCard";
import { FileText, TrendingUp, Clock, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartSkeleton } from "@/components/skeleton/ChartSkeleton";
import { KPICardSkeleton } from "@/components/skeleton/KPICardSkeleton";

interface ProposalAnalyticsDashboardProps {
  period?: '7d' | '30d' | '90d';
}

export function ProposalAnalyticsDashboard({ period = '30d' }: ProposalAnalyticsDashboardProps) {
  const { data, isLoading, error } = useProposalAnalytics({ period });

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Error loading analytics: {error.message}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <ChartSkeleton />
      </div>
    );
  }

  if (!data) return null;

  const { metrics, funnelData, timeSeriesData } = data;

  const chartConfig = {
    sent: {
      label: "Sent",
      color: "hsl(var(--primary))",
    },
    viewed: {
      label: "Viewed",
      color: "hsl(var(--chart-2))",
    },
    signed: {
      label: "Signed",
      color: "hsl(var(--chart-3))",
    },
    declined: {
      label: "Declined",
      color: "hsl(var(--destructive))",
    },
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ProposalMetricsCard
          title="Total Proposals"
          value={metrics.totalProposals}
          icon={FileText}
          description={`${metrics.activeProposals} currently active`}
        />
        <ProposalMetricsCard
          title="Conversion Rate"
          value={metrics.conversionRate}
          format="percentage"
          icon={Target}
          trend={metrics.conversionRate > 50 ? "up" : metrics.conversionRate > 25 ? "neutral" : "down"}
          change={12.5}
        />
        <ProposalMetricsCard
          title="Avg Time to Sign"
          value={metrics.avgTimeToSign}
          format="duration"
          icon={Clock}
          change={-8.3}
          trend="up"
        />
        <ProposalMetricsCard
          title="Signed This Period"
          value={metrics.signedCount}
          icon={TrendingUp}
          description={`${metrics.sentCount} sent total`}
          change={15.2}
          trend="up"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
            <CardDescription>
              Proposal journey from sent to signed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <BarChart data={funnelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="stage" type="category" width={80} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
            <div className="mt-4 space-y-2">
              {funnelData.map((stage, idx) => (
                <div key={stage.stage} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{stage.stage}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{stage.count}</span>
                    <span className="text-muted-foreground">
                      ({stage.percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Proposal Status</CardTitle>
            <CardDescription>
              Current distribution of all proposals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <BarChart
                data={[
                  { status: 'Sent', count: metrics.sentCount - metrics.viewedCount },
                  { status: 'Viewed', count: metrics.viewedCount - metrics.signedCount },
                  { status: 'Signed', count: metrics.signedCount },
                  { status: 'Declined', count: metrics.declinedCount },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Time Series Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Proposal Activity Over Time</CardTitle>
          <CardDescription>
            Daily breakdown of proposal status changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px]">
            <AreaChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="sent"
                stackId="1"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="viewed"
                stackId="1"
                stroke="hsl(var(--chart-2))"
                fill="hsl(var(--chart-2))"
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="signed"
                stackId="1"
                stroke="hsl(var(--chart-3))"
                fill="hsl(var(--chart-3))"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}

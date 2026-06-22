import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line, Legend } from "recharts";
import { TrendingUp, DollarSign, Award, Target, AlertTriangle } from "lucide-react";
import { formatDecimal, getClientName } from "@/lib/utils";

interface AnalyticsDeal {
  id: string; deal_name: string; stage: string; value: number; created_at: string;
  days_in_stage?: number | null; expected_close_date?: string | null; owner?: string | null;
  client?: unknown; clients?: unknown;
}

interface OptimizedDealAnalyticsProps { deals: AnalyticsDeal[]; }

export const OptimizedDealAnalytics = React.memo(function OptimizedDealAnalytics({ deals }: OptimizedDealAnalyticsProps) {
  const analytics = useMemo(() => {
    const totalValue = deals.reduce((sum, deal) => sum + (deal.value || 0), 0);
    const totalDeals = deals.length;
    const avgDealSize = totalDeals > 0 ? totalValue / totalDeals : 0;
    const wonDeals = deals.filter(d => d.stage === 'accepted' || d.stage === 'won').length;
    const winRate = totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0;

    const stageConversion = deals.reduce((acc, deal) => { const stage = deal.stage || 'unknown'; acc[stage] = (acc[stage] || 0) + 1; return acc; }, {} as Record<string, number>);
    const stageData = Object.entries(stageConversion).map(([name, count]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), count }));

    const monthlyTrend = deals.reduce((acc, deal) => {
      if (!deal.created_at) return acc;
      const date = new Date(deal.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!acc[monthKey]) acc[monthKey] = { month: monthKey, created: 0, won: 0, totalValue: 0 };
      acc[monthKey].created++;
      acc[monthKey].totalValue += deal.value || 0;
      if (deal.stage === 'won' || deal.stage === 'accepted') acc[monthKey].won++;
      return acc;
    }, {} as Record<string, any>);
    const monthlyData = Object.values(monthlyTrend).sort((a: any, b: any) => a.month.localeCompare(b.month)).slice(-12);

    const clientAnalysis = deals.reduce((acc, deal) => {
      const clientName = getClientName(deal.client, deal.clients);
      if (!acc[clientName]) acc[clientName] = { name: clientName, dealCount: 0, totalValue: 0, wonValue: 0 };
      acc[clientName].dealCount++;
      acc[clientName].totalValue += deal.value || 0;
      if (deal.stage === 'won' || deal.stage === 'accepted') acc[clientName].wonValue += deal.value || 0;
      return acc;
    }, {} as Record<string, any>);
    const topClients = Object.values(clientAnalysis).sort((a: any, b: any) => b.totalValue - a.totalValue).slice(0, 10);

    const stagnantDeals = deals.filter(d => d.days_in_stage && d.days_in_stage > 60 && !['won', 'lost', 'accepted'].includes(d.stage)).length;
    const stagnantValue = deals.filter(d => d.days_in_stage && d.days_in_stage > 60 && !['won', 'lost', 'accepted'].includes(d.stage)).reduce((sum, d) => sum + (d.value || 0), 0);

    return { totalValue, totalDeals, avgDealSize, winRate, stageData, monthlyData, topClients, stagnantDeals, stagnantValue };
  }, [deals]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Value</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">${analytics.totalValue.toLocaleString()}</div><p className="text-xs text-muted-foreground">Across all deals</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Deals</CardTitle><Target className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{analytics.totalDeals}</div><p className="text-xs text-muted-foreground">In pipeline</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Avg Deal Size</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">${analytics.avgDealSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div><p className="text-xs text-muted-foreground">Per deal</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Win Rate</CardTitle><Award className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatDecimal(analytics.winRate, 2)}%</div><p className="text-xs text-muted-foreground">Conversion rate</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Stagnant Deals</CardTitle><AlertTriangle className="h-4 w-4 text-amber-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-amber-600">{analytics.stagnantDeals}</div><p className="text-xs text-muted-foreground">${analytics.stagnantValue.toLocaleString()} at risk (60+ days)</p></CardContent></Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle>Stage Distribution</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><BarChart data={analytics.stageData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="count" fill="hsl(var(--primary))" /></BarChart></ResponsiveContainer></CardContent></Card>
        <Card><CardHeader><CardTitle>Monthly Deal Trend</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><ComposedChart data={analytics.monthlyData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis yAxisId="left" /><YAxis yAxisId="right" orientation="right" /><Tooltip /><Legend /><Bar yAxisId="left" dataKey="created" fill="hsl(var(--chart-1))" name="Created" /><Bar yAxisId="left" dataKey="won" fill="hsl(var(--chart-2))" name="Won" /><Line yAxisId="right" type="monotone" dataKey="totalValue" stroke="hsl(var(--chart-3))" name="Value ($)" strokeWidth={2} /></ComposedChart></ResponsiveContainer></CardContent></Card>
        <Card className="lg:col-span-2"><CardHeader><CardTitle>Top 10 Clients by Value</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><BarChart data={analytics.topClients} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="name" type="category" width={150} /><Tooltip /><Legend /><Bar dataKey="totalValue" fill="hsl(var(--chart-1))" name="Total Value ($)" /><Bar dataKey="wonValue" fill="hsl(var(--chart-2))" name="Won Value ($)" /></BarChart></ResponsiveContainer></CardContent></Card>
      </div>
    </div>
  );
});

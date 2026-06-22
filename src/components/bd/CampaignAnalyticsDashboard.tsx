import { useMemo } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  TrendingUp,
  Users,
  MessageCircle,
  Phone,
  Briefcase,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { FunnelChart, Funnel, LabelList, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend } from 'recharts';
import type { BDCampaign } from '@/hooks/useBDCampaigns';

interface CampaignAnalyticsDashboardProps {
  campaigns: BDCampaign[];
}

export function CampaignAnalyticsDashboard({ campaigns }: CampaignAnalyticsDashboardProps) {
  const analyticsData = useMemo(() => {
    const totalContacts = campaigns.reduce((acc, c) => acc + (c.actual_contacts_reached ?? 0), 0);
    const totalResponses = campaigns.reduce((acc, c) => acc + (c.responses_received ?? 0), 0);
    const totalMeetings = campaigns.reduce((acc, c) => acc + (c.meetings_booked ?? 0), 0);
    const totalDeals = campaigns.reduce((acc, c) => acc + (c.deals_generated ?? 0), 0);

    // Calculate conversion rates
    const responseRate = totalContacts > 0 ? (totalResponses / totalContacts) * 100 : 0;
    const meetingRate = totalResponses > 0 ? (totalMeetings / totalResponses) * 100 : 0;
    const dealRate = totalMeetings > 0 ? (totalDeals / totalMeetings) * 100 : 0;
    const overallConversion = totalContacts > 0 ? (totalDeals / totalContacts) * 100 : 0;

    // ROI calculations (assuming average deal value and cost per contact)
    const avgDealValue = 50000; // $50k average deal
    const costPerContact = 50; // $50 per contact reached
    const totalRevenue = totalDeals * avgDealValue;
    const totalCost = totalContacts * costPerContact;
    const roi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;

    return {
      totalContacts,
      totalResponses,
      totalMeetings,
      totalDeals,
      responseRate,
      meetingRate,
      dealRate,
      overallConversion,
      roi,
      totalRevenue,
      totalCost,
    };
  }, [campaigns]);

  // Funnel data
  const funnelData = [
    { name: 'Contacts Reached', value: analyticsData.totalContacts, fill: 'hsl(var(--primary))' },
    { name: 'Responses', value: analyticsData.totalResponses, fill: 'hsl(var(--accent))' },
    { name: 'Meetings', value: analyticsData.totalMeetings, fill: 'hsl(var(--success))' },
    { name: 'Deals', value: analyticsData.totalDeals, fill: 'hsl(var(--warning))' },
  ];

  // Campaign performance comparison
  const campaignPerformance = campaigns
    .filter(c => c.status === 'active' || c.status === 'completed')
    .slice(0, 5)
    .map(c => ({
      name: c.name.length > 20 ? c.name.slice(0, 20) + '...' : c.name,
      contacts: c.actual_contacts_reached ?? 0,
      responses: c.responses_received ?? 0,
      meetings: c.meetings_booked ?? 0,
      deals: c.deals_generated ?? 0,
    }));

  // Trend data (simulated monthly data)
  const trendData = [
    { month: 'Jan', contacts: 150, responses: 45, meetings: 18, deals: 5 },
    { month: 'Feb', contacts: 200, responses: 60, meetings: 24, deals: 7 },
    { month: 'Mar', contacts: 250, responses: 85, meetings: 32, deals: 10 },
    { month: 'Apr', contacts: 300, responses: 105, meetings: 40, deals: 12 },
    { month: 'May', contacts: 280, responses: 95, meetings: 38, deals: 11 },
    { month: 'Jun', contacts: 350, responses: 120, meetings: 48, deals: 15 },
  ];

  const chartConfig = {
    contacts: {
      label: 'Contacts',
      color: 'hsl(var(--primary))',
    },
    responses: {
      label: 'Responses',
      color: 'hsl(var(--accent))',
    },
    meetings: {
      label: 'Meetings',
      color: 'hsl(var(--success))',
    },
    deals: {
      label: 'Deals',
      color: 'hsl(var(--warning))',
    },
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Conversion</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.overallConversion.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">Contacts to deals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.responseRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">{analyticsData.totalResponses} of {analyticsData.totalContacts}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meeting Rate</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.meetingRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">{analyticsData.totalMeetings} meetings booked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROI</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              {analyticsData.roi > 0 ? (
                <ArrowUpRight className="h-5 w-5 text-success mr-1" />
              ) : (
                <ArrowDownRight className="h-5 w-5 text-destructive mr-1" />
              )}
              {analyticsData.roi.toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">
              ${(analyticsData.totalRevenue / 1000).toFixed(0)}k revenue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
            <CardDescription>Pipeline progression across all campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <FunnelChart>
                  <Funnel
                    dataKey="value"
                    data={funnelData}
                    isAnimationActive
                  >
                    <LabelList position="right" fill="hsl(var(--foreground))" stroke="none" dataKey="name" />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Campaign Performance Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Top Campaign Performance</CardTitle>
            <CardDescription>Comparing metrics across active campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campaignPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="contacts" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="responses" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="meetings" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="deals" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Trends</CardTitle>
          <CardDescription>Monthly performance metrics over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="contacts"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                  name="Contacts"
                />
                <Line
                  type="monotone"
                  dataKey="responses"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--accent))' }}
                  name="Responses"
                />
                <Line
                  type="monotone"
                  dataKey="meetings"
                  stroke="hsl(var(--success))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--success))' }}
                  name="Meetings"
                />
                <Line
                  type="monotone"
                  dataKey="deals"
                  stroke="hsl(var(--warning))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--warning))' }}
                  name="Deals"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* ROI Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>ROI Breakdown</CardTitle>
          <CardDescription>Financial performance analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Total Cost</span>
              </div>
              <div className="text-2xl font-bold">${(analyticsData.totalCost / 1000).toFixed(1)}k</div>
              <p className="text-xs text-muted-foreground">
                {analyticsData.totalContacts} contacts × $50
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Total Revenue</span>
              </div>
              <div className="text-2xl font-bold">${(analyticsData.totalRevenue / 1000).toFixed(1)}k</div>
              <p className="text-xs text-muted-foreground">
                {analyticsData.totalDeals} deals × $50k
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Net Profit</span>
              </div>
              <div className="text-2xl font-bold text-success">
                ${((analyticsData.totalRevenue - analyticsData.totalCost) / 1000).toFixed(1)}k
              </div>
              <p className="text-xs text-muted-foreground">
                {analyticsData.roi.toFixed(0)}% return
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

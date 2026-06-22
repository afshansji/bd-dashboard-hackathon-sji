import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAnalyticsDashboard } from '@/hooks/useAnalyticsDashboard';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Target, Users, Zap } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AnalyticsDashboard() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [source, setSource] = useState<string>('all');

  const { data, isLoading } = useAnalyticsDashboard({
    period,
    source: source === 'all' ? undefined : source,
  });

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">Real-time performance metrics and insights</p>
        </div>
        
        <div className="flex gap-4">
          <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>

          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="campaigns">Campaigns</SelectItem>
              <SelectItem value="deals">Deals</SelectItem>
              <SelectItem value="leads">Leads</SelectItem>
              <SelectItem value="ai_agents">AI Agents</SelectItem>
              <SelectItem value="eod">EOD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Top Metrics Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-3 w-20 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {data?.topMetrics.slice(0, 4).map((metric, index) => {
            const icons = [Activity, Target, Users, Zap];
            const Icon = icons[index] || Activity;
            const isPositive = metric.change >= 0;

            return (
              <Card key={metric.name}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium capitalize">
                    {metric.name.replace(/_/g, ' ')}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metric.value.toLocaleString()}</div>
                  <p className={`text-xs flex items-center gap-1 mt-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {isPositive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {Math.abs(metric.change).toFixed(1)}% from last period
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Time Series Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Trends</CardTitle>
          <CardDescription>Daily activity metrics over the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={data?.timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                {data?.topMetrics.slice(0, 3).map((metric, index) => {
                  const colors = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))'];
                  return (
                    <Line
                      key={metric.name}
                      type="monotone"
                      dataKey={`metrics.${metric.name}`}
                      stroke={colors[index]}
                      name={metric.name.replace(/_/g, ' ')}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Metrics Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Top Metrics</CardTitle>
          <CardDescription>Highest performing metrics by total value</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.topMetrics.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Events:</span>
              <span className="font-medium">{data.summary.totalEvents}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Period:</span>
              <span className="font-medium">
                {new Date(data.summary.periodStart).toLocaleDateString()} - {new Date(data.summary.periodEnd).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

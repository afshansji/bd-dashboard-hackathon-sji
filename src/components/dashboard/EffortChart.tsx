import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useAnalytics } from "@/hooks/useAnalytics";

export default function EffortChart() {
  const { chartData, stats, loading, error } = useAnalytics();

  if (loading) {
    return (
      <Card className="col-span-1 lg:col-span-2">
        <CardContent className="flex items-center justify-center h-80">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-1 lg:col-span-2">
        <CardContent className="flex items-center justify-center h-80">
          <p className="text-muted-foreground">Error loading analytics data</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-foreground">
          Effort vs Results Trend
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Weekly comparison of team effort hours vs business development results
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                className="text-muted-foreground"
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: 'var(--shadow-lg)',
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="effort" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                name="Effort Hours"
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="results" 
                stroke="hsl(var(--accent))" 
                strokeWidth={3}
                name="Results Score"
                dot={{ fill: 'hsl(var(--accent))', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Avg Effort</p>
            <p className="text-lg font-semibold text-primary">{stats.avgEffort}h</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Avg Results</p>
            <p className="text-lg font-semibold text-accent">{stats.avgResults}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Efficiency Ratio</p>
            <p className="text-lg font-semibold text-success">{stats.efficiencyRatio}x</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
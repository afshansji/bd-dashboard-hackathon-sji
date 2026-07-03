import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  BarChart3,
  Bot,
  Briefcase,
  Clock,
  Layers,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useJobBoardDashboard } from "@/hooks/useJobBoardDashboard";

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  accent,
  delay = 0,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: typeof Briefcase;
  accent: string;
  delay?: number;
}) {
  return (
    <Card
      className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 fill-mode-both overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className="text-3xl font-bold tracking-tight">{value}</div>
        </div>
        <div className={`rounded-xl p-2.5 ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function ChartSkeleton({ height = 280 }: { height?: number }) {
  return <Skeleton className="w-full rounded-lg" style={{ height }} />;
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export function JobBoardDashboardPage() {
  const { data, isLoading, isError, error } = useJobBoardDashboard();

  return (
    <div className="space-y-8 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 px-2 text-muted-foreground">
            <Link to="/bd/upwork-jobs">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              All leads
            </Link>
          </Button>
          <h1 className="flex items-center gap-2.5 text-3xl font-bold tracking-tight">
            <BarChart3 className="h-8 w-8 text-primary" />
            Job Board Dashboard
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Overview of imported leads, AI analysis coverage, source mix, and estimated
            time saved across your job boards.
          </p>
        </div>
      </div>

      {isError ? (
        <Alert variant="destructive">
          <AlertTitle>Failed to load dashboard</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Unknown error"}
          </AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total leads"
            value={data.totalLeads}
            description="Imported from all job boards"
            icon={Briefcase}
            accent="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
            delay={0}
          />
          <MetricCard
            title="AI analyzed"
            value={data.analyzedCount}
            description={`${data.totalLeads > 0 ? Math.round((data.analyzedCount / data.totalLeads) * 100) : 0}% coverage`}
            icon={Bot}
            accent="bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
            delay={60}
          />
          <MetricCard
            title="Company reports"
            value={data.companyReportsCount}
            description="AI company intelligence generated"
            icon={Layers}
            accent="bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
            delay={120}
          />
          <MetricCard
            title="Time saved"
            value={`${data.estimatedHoursSaved}h`}
            description="Estimated vs manual research"
            icon={Clock}
            accent="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
            delay={180}
          />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="animate-in fade-in-0 duration-500" style={{ animationDelay: "200ms" }}>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Leads by source</CardTitle>
            <CardDescription className="text-xs">
              Where opportunities are coming from
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton />
            ) : data && data.sourceBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data.sourceBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                  >
                    {data.sourceBreakdown.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="No lead source data yet" />
            )}
          </CardContent>
        </Card>

        <Card className="animate-in fade-in-0 duration-500" style={{ animationDelay: "260ms" }}>
          <CardHeader>
            <CardTitle className="text-base font-semibold">AI recommendations</CardTitle>
            <CardDescription className="text-xs">
              Pursue / review / ignore breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton />
            ) : data && data.recommendationBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data.recommendationBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {data.recommendationBreakdown.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="Run AI analysis on leads to see recommendations" />
            )}
          </CardContent>
        </Card>

        <Card className="animate-in fade-in-0 duration-500 lg:col-span-2" style={{ animationDelay: "320ms" }}>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Leads imported (30 days)</CardTitle>
            <CardDescription className="text-xs">Daily import volume</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton height={300} />
            ) : data ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.leadsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar
                    dataKey="leads"
                    name="Leads"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                    animationDuration={800}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </CardContent>
        </Card>

        <Card className="animate-in fade-in-0 duration-500 lg:col-span-2" style={{ animationDelay: "380ms" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <TrendingUp className="h-4 w-4 text-primary" />
              Imported vs AI analyzed (weekly)
            </CardTitle>
            <CardDescription className="text-xs">
              Double-bar comparison over the last 6 weeks
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton height={300} />
            ) : data ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.weeklyComparison}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="imported"
                    name="Imported"
                    fill="#94a3b8"
                    radius={[4, 4, 0, 0]}
                    animationDuration={800}
                  />
                  <Bar
                    dataKey="analyzed"
                    name="AI analyzed"
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                    animationDuration={1000}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </CardContent>
        </Card>

        <Card className="animate-in fade-in-0 duration-500" style={{ animationDelay: "440ms" }}>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Lead type mix</CardTitle>
            <CardDescription className="text-xs">Hiring, posts, and job listings</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton />
            ) : data && data.leadTypeBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.leadTypeBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="Leads" radius={[0, 4, 4, 0]} animationDuration={700}>
                    {data.leadTypeBreakdown.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="No lead type data" />
            )}
          </CardContent>
        </Card>

        <Card className="animate-in fade-in-0 duration-500" style={{ animationDelay: "500ms" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Sparkles className="h-4 w-4 text-violet-500" />
              Manual vs AI-assisted tasks
            </CardTitle>
            <CardDescription className="text-xs">
              Estimated workload comparison by task type
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton />
            ) : data ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.aiVsManualTasks}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="task" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="manual"
                    name="Manual"
                    fill="#cbd5e1"
                    radius={[4, 4, 0, 0]}
                    animationDuration={700}
                  />
                  <Bar
                    dataKey="aiAssisted"
                    name="AI-assisted"
                    fill="#22c55e"
                    radius={[4, 4, 0, 0]}
                    animationDuration={900}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </CardContent>
        </Card>

        <Card className="animate-in fade-in-0 duration-500 lg:col-span-2" style={{ animationDelay: "560ms" }}>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Analysis trend</CardTitle>
            <CardDescription className="text-xs">
              Cumulative AI analyses over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton height={240} />
            ) : data && data.analyzedCount > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart
                  data={data.leadsOverTime.map((row, i, arr) => ({
                    date: row.date,
                    cumulative: Math.round(
                      (data.analyzedCount * (i + 1)) / arr.length,
                    ),
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    name="Analyses"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={false}
                    animationDuration={1000}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="No analysis history yet" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

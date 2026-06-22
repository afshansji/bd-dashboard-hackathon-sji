import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDHSTeamSummary } from "@/hooks/useDHSSubmissions";
import { Loader2, Users, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface DHSTeamSummaryProps {
  date?: Date;
}

export function DHSTeamSummary({ date }: DHSTeamSummaryProps) {
  const { data: summary, isLoading } = useDHSTeamSummary(date);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const submissionRateColor =
    summary.submission_rate >= 80 ? "text-green-600" :
    summary.submission_rate >= 50 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="space-y-4">
      {/* Main Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submission Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${submissionRateColor}`}>
              {summary.submission_rate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.total_submissions} submissions today
            </p>
            <Progress value={summary.submission_rate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Participation</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total_submissions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Team members submitted DHS
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {summary.submission_rate < 50 && (
        <Card className="border-yellow-500 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-yellow-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-yellow-800">
            <ul className="list-disc list-inside space-y-1">
              <li>Low submission rate ({summary.submission_rate.toFixed(0)}%) - Follow up with team members</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


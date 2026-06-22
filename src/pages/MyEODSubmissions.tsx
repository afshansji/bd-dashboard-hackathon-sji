import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMyEODHistory } from "@/hooks/useTeamSummaries";
import { useAuth } from "@/hooks/useAuth";
import { format, subDays, startOfMonth } from "date-fns";
import { Calendar, Loader2, Edit } from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EODEditDialog } from "@/components/eod/EODEditDialog";

type DateFilter = "all" | "last7" | "last30" | "thisMonth";

export default function MyEODSubmissions() {
  const { user } = useAuth();
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [editingSubmission, setEditingSubmission] = useState<any | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Calculate date range based on filter
  const getDateRange = () => {
    const today = new Date().toISOString().split('T')[0];

    switch (dateFilter) {
      case "last7":
        return {
          start: subDays(new Date(), 7).toISOString().split('T')[0],
          end: today,
        };
      case "last30":
        return {
          start: subDays(new Date(), 30).toISOString().split('T')[0],
          end: today,
        };
      case "thisMonth":
        return {
          start: startOfMonth(new Date()).toISOString().split('T')[0],
          end: today,
        };
      default:
        return undefined;
    }
  };

  const { data: submissions, isLoading } = useMyEODHistory(user?.id, getDateRange());

  // Check if a submission is from today
  const isToday = (date: string) => {
    const today = new Date().toISOString().split('T')[0];
    return date === today;
  };

  const handleEditClick = (submission: any) => {
    setEditingSubmission(submission);
    setIsEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My EOD Submissions</h1>
          <p className="text-muted-foreground">View your end-of-day submission history</p>
        </div>
        <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as DateFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="last7">Last 7 Days</SelectItem>
            <SelectItem value="last30">Last 30 Days</SelectItem>
            <SelectItem value="thisMonth">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {submissions && submissions.length > 0 ? (
          submissions.map((submission: any) => (
            <Card key={submission.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {format(new Date(submission.date), "MMMM d, yyyy")}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {submission.hours_worked && (
                      <Badge variant="secondary">
                        {submission.hours_worked} hours
                      </Badge>
                    )}
                    {isToday(submission.date) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClick(submission)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {submission.tasks_completed && (
                  <div>
                    <h4 className="font-medium mb-2">Tasks Completed</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {submission.tasks_completed}
                    </p>
                  </div>
                )}

                {submission.tomorrow_plan && (
                  <div>
                    <h4 className="font-medium mb-2">Tomorrow's Plan</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {submission.tomorrow_plan}
                    </p>
                  </div>
                )}

                {submission.challenges && (
                  <div>
                    <h4 className="font-medium mb-2">Challenges</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {submission.challenges}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No EOD submissions yet</p>
            </CardContent>
          </Card>
        )}
      </div>

      {editingSubmission && (
        <EODEditDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          submission={editingSubmission}
        />
      )}
    </div>
  );
}

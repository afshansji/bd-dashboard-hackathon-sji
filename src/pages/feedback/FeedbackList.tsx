import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { useAuth } from "@/hooks/useAuth";
import { listFeedbackReports, type FeedbackStatus, type FeedbackType, type FeedbackPriority } from "@/features/feedback/api";
import { cn } from "@/lib/utils";
import { Bug, Sparkles, User, Plus, Inbox } from "lucide-react";

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  open: "Open",
  in_review: "In review",
  resolved: "Resolved",
  closed: "Closed",
};

const STATUS_STYLES: Record<FeedbackStatus, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-100",
  in_review: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100",
  resolved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100",
  closed: "bg-slate-200 text-slate-700 dark:bg-slate-800/60 dark:text-slate-100",
};

const PRIORITY_LABELS: Record<FeedbackPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const PRIORITY_STYLES: Record<FeedbackPriority, string> = {
  low: "bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-100",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-100",
  high: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-100",
};

type TabKey = "bugs" | "features" | "my_submissions";

const TABS: Record<TabKey, { label: string; description: string; icon: React.ReactNode }> = {
  bugs: {
    label: "Bugs",
    description: "Track platform issues reported by the team.",
    icon: <Bug className="h-4 w-4" />,
  },
  features: {
    label: "Features",
    description: "Review enhancement requests.",
    icon: <Sparkles className="h-4 w-4" />,
  },
  my_submissions: {
    label: "My Submissions",
    description: "View feedback you have submitted.",
    icon: <User className="h-4 w-4" />,
  },
};

export default function FeedbackList() {
  const [activeTab, setActiveTab] = useState<TabKey>("bugs");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { enabled: feedbackEnabled } = useFeatureFlag("feedback_enabled");

  const bugsQuery = useQuery({
    queryKey: ["feedback-list", "bugs"],
    queryFn: () => listFeedbackReports({ type: "bug" as FeedbackType, statuses: ["open", "in_review"] }),
    enabled: feedbackEnabled,
  });

  const featuresQuery = useQuery({
    queryKey: ["feedback-list", "features"],
    queryFn: () => listFeedbackReports({ type: "feature" as FeedbackType, statuses: ["open", "in_review"] }),
    enabled: feedbackEnabled,
  });

  const mySubmissionsQuery = useQuery({
    queryKey: ["feedback-list", "my_submissions"],
    queryFn: () => listFeedbackReports({ includeClosed: true }),
    enabled: feedbackEnabled && !!user?.id,
  });

  const getActiveData = () => {
    switch (activeTab) {
      case "bugs":
        return bugsQuery;
      case "features":
        return featuresQuery;
      case "my_submissions":
        return mySubmissionsQuery;
    }
  };

  const activeQuery = getActiveData();

  // Filter my_submissions to only show user's own feedback
  const items = useMemo(() => {
    if (activeTab === "my_submissions" && user?.id) {
      return (mySubmissionsQuery.data?.items ?? []).filter(
        (item) => item.created_by === user.id
      );
    }
    return activeQuery.data?.items ?? [];
  }, [activeTab, activeQuery.data?.items, mySubmissionsQuery.data?.items, user?.id]);

  if (!feedbackEnabled) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Feedback module is disabled.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Feedback</h1>
          <p className="text-muted-foreground">
            View and update bugs and feature requests.
          </p>
        </div>
        <Button asChild>
          <Link to="/feedback/submit">
            <Plus className="h-4 w-4 mr-2" /> Submit Feedback
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          {Object.entries(TABS).map(([key, config]) => (
            <TabsTrigger key={key} value={key} className="flex items-center gap-2">
              {config.icon}
              {config.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(TABS).map(([key, config]) => (
          <TabsContent key={key} value={key}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{config.label}</CardTitle>
                  <CardDescription>{config.description}</CardDescription>
                </div>
                <Badge variant="outline" className="gap-2 text-xs">
                  <Inbox className="h-3.5 w-3.5" /> {items.length} items
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">Subject</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Submitted by</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeQuery.isLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                            Loading feedback…
                          </TableCell>
                        </TableRow>
                      ) : items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                            No feedback found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        items.map((item) => (
                          <TableRow
                            key={item.id}
                            className="cursor-pointer hover:bg-muted/40"
                            onClick={() => navigate(`/feedback/${item.id}`)}
                          >
                            <TableCell className="font-medium">{item.subject}</TableCell>
                            <TableCell>
                              <Badge variant={item.type === "bug" ? "destructive" : "default"}>
                                {item.type === "bug" ? "Bug" : "Feature"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={cn("text-xs", STATUS_STYLES[item.status])}>
                                {STATUS_LABELS[item.status]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {item.priority ? (
                                <Badge className={cn("text-xs", PRIORITY_STYLES[item.priority])}>
                                  {PRIORITY_LABELS[item.priority]}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span>{item.submitted_by_name ?? item.email ?? "—"}</span>
                              </div>
                            </TableCell>
                            <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

import { Bug, CheckCircle2, Sparkles, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FeedbackStatsCardsProps {
  openBugs: number;
  openBugHighPriority: number;
  openFeatures: number;
  totalFeatures: number;
  inProgress: number;
  resolved: number;
}

export function FeedbackStatsCards({
  openBugs,
  openBugHighPriority,
  openFeatures,
  totalFeatures,
  inProgress,
  resolved,
}: FeedbackStatsCardsProps) {
  const cards = [
    {
      title: "Open Bugs",
      value: openBugs,
      detail: `${openBugHighPriority} high priority`,
      icon: Bug,
      tone: "text-red-600",
    },
    {
      title: "Open Features",
      value: openFeatures,
      detail: `${totalFeatures} total requests`,
      icon: Sparkles,
      tone: "text-amber-600",
    },
    {
      title: "In Progress",
      value: inProgress,
      detail: "Bugs + features",
      icon: TrendingUp,
      tone: "text-blue-600",
    },
    {
      title: "Resolved",
      value: resolved,
      detail: "Completed",
      icon: CheckCircle2,
      tone: "text-emerald-600",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className={`h-4 w-4 ${card.tone}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.detail}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

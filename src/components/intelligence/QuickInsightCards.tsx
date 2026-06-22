import { Card } from "@/components/ui/card";
import { 
  Activity, 
  Bell, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Calendar 
} from "lucide-react";

interface QuickInsightCardsProps {
  onSelectInsight: (question: string) => void;
  isLoading: boolean;
}

const QUICK_INSIGHTS = [
  {
    icon: Activity,
    title: "Pipeline Health",
    description: "Analyze deal status, stalled deals, and close date risks",
    question: "Analyze my pipeline health: identify stalled deals, upcoming close dates at risk, and any red flags across all active deals. Prioritize by urgency.",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Bell,
    title: "Follow-up Audit",
    description: "Find overdue follow-ups and deals with no recent activity",
    question: "Audit all follow-ups: which are overdue, which deals have no recent activity in 14+ days, and what actions should I prioritize this week?",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    icon: Users,
    title: "Relationship Map",
    description: "Who's engaged, recent touchpoints, key contacts",
    question: "Map our relationship with this client: who from our team has engaged, when were the last touchpoints, and which stakeholders should we nurture?",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: TrendingUp,
    title: "Upsell Opportunities",
    description: "Based on deal history, suggest expansion areas",
    question: "Based on our deal history and client profile, what upsell or cross-sell opportunities exist? What products/services could we propose?",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    icon: AlertTriangle,
    title: "Risk Assessment",
    description: "Deals at risk based on comments and patterns",
    question: "Perform a risk assessment: which deals are at risk based on recent comments, stalled stages, or unusual patterns? What should I do to mitigate?",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  {
    icon: Calendar,
    title: "Week Prep Brief",
    description: "What you need to know for meetings this week",
    question: "Prepare my weekly brief: summarize key deals, upcoming deadlines, pending follow-ups, and the most important actions I should take this week.",
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
  },
];

export function QuickInsightCards({ onSelectInsight, isLoading }: QuickInsightCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {QUICK_INSIGHTS.map((insight) => (
        <Card
          key={insight.title}
          className={`p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${
            isLoading ? "opacity-50 pointer-events-none" : ""
          }`}
          onClick={() => onSelectInsight(insight.question)}
        >
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${insight.bgColor}`}>
              <insight.icon className={`h-4 w-4 ${insight.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm">{insight.title}</h4>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {insight.description}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

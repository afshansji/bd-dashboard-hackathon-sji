import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  Trophy,
  Calendar,
  Target,
  MessageSquare,
  ClipboardList,
} from "lucide-react";

interface QuickInsight {
  icon: React.ReactNode;
  title: string;
  question: string;
}

const quickInsights: QuickInsight[] = [
  {
    icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    title: "At-Risk Reps",
    question: "Which team members are at risk this week and need coaching support?",
  },
  {
    icon: <Trophy className="h-5 w-5 text-green-500" />,
    title: "Top Performers",
    question: "Who are the top performers this week? What are their key wins?",
  },
  {
    icon: <TrendingUp className="h-5 w-5 text-blue-500" />,
    title: "Weekly Metrics",
    question: "Summarize the key performance metrics for this week compared to last week.",
  },
  {
    icon: <Calendar className="h-5 w-5 text-purple-500" />,
    title: "WIG Agenda",
    question: "What should I focus on in Monday's WIG meeting? Give me the top 3 agenda items.",
  },
  {
    icon: <Users className="h-5 w-5 text-orange-500" />,
    title: "DHS Compliance",
    question: "Who hasn't submitted their DHS entries this week?",
  },
  {
    icon: <Target className="h-5 w-5 text-red-500" />,
    title: "Goal Progress",
    question: "How is the team tracking against quarterly goals? Any concerns?",
  },
  {
    icon: <MessageSquare className="h-5 w-5 text-cyan-500" />,
    title: "Coaching Tips",
    question: "Based on this week's data, what coaching conversations should I prioritize?",
  },
  {
    icon: <ClipboardList className="h-5 w-5 text-indigo-500" />,
    title: "Action Summary",
    question: "What are the top 5 action items I should address this week?",
  },
];

interface QuickBDInsightCardsProps {
  onSelectQuestion: (question: string) => void;
}

export function QuickBDInsightCards({ onSelectQuestion }: QuickBDInsightCardsProps) {
  return (
    <div className="p-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Insights</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickInsights.map((insight, index) => (
          <Card
            key={index}
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => onSelectQuestion(insight.question)}
          >
            <CardContent className="p-3 flex flex-col items-center text-center gap-2">
              {insight.icon}
              <span className="text-sm font-medium">{insight.title}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

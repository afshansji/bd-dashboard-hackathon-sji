import { Bug, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function FeedbackQuickSubmit() {
  const cards = [
    {
      title: "Bug Reports",
      description: "Report issues, glitches, or broken workflows.",
      icon: Bug,
      href: "/feedback/submit?type=bug",
      buttonLabel: "Submit Bug Report",
    },
    {
      title: "Feature Requests",
      description: "Suggest new capabilities or improvements.",
      icon: Sparkles,
      href: "/feedback/submit?type=feature",
      buttonLabel: "Submit Feature Request",
    },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {cards.map((card) => (
        <Card key={card.title} className="h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">{card.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{card.description}</p>
            </div>
            <card.icon className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to={card.href}>{card.buttonLabel}</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

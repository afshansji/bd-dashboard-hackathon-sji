import { Sparkles, CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";

interface OnboardingStep {
  label: string;
  completed: boolean;
  action: () => void;
}

interface EmptyDashboardProps {
  userName?: string;
  brandsCount: number;
  kpisCount: number;
  projectsCount: number;
}

export function EmptyDashboard({
  userName,
  brandsCount,
  kpisCount,
  projectsCount,
}: EmptyDashboardProps) {
  const navigate = useNavigate();

  const steps: OnboardingStep[] = [
    {
      label: "Create your first brand",
      completed: brandsCount > 0,
      action: () => navigate("/admin/brands"),
    },
    {
      label: "Set up KPIs to track",
      completed: kpisCount > 0,
      action: () => navigate("/admin/kpi-config"),
    },
    {
      label: "Create a project",
      completed: projectsCount > 0,
      action: () => navigate("/projects"),
    },
  ];

  const completedSteps = steps.filter((s) => s.completed).length;
  const progress = (completedSteps / steps.length) * 100;
  const nextStep = steps.find((s) => !s.completed);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-4">
              <Sparkles className="h-12 w-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl">
            {userName ? `Welcome, ${userName}!` : "Welcome!"}
          </CardTitle>
          <p className="text-muted-foreground mt-2">
            Let's get your dashboard set up. Complete these steps to start tracking your business development performance.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Setup Progress</span>
              <span className="text-muted-foreground">
                {completedSteps} of {steps.length} completed
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {step.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span
                    className={
                      step.completed
                        ? "text-muted-foreground line-through"
                        : "font-medium"
                    }
                  >
                    {step.label}
                  </span>
                </div>
                {!step.completed && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={step.action}
                  >
                    Start
                  </Button>
                )}
              </div>
            ))}
          </div>

          {nextStep && (
            <Button
              onClick={nextStep.action}
              className="w-full"
              size="lg"
            >
              {completedSteps === 0 ? "Get Started" : "Continue Setup"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Play, CheckCircle2, XCircle, PauseCircle, TrendingUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface SequenceExecutionMetricsProps {
  metrics: {
    total: number;
    active: number;
    completed: number;
    failed: number;
    paused: number;
    successRate: string;
  };
  isLoading?: boolean;
}

export function SequenceExecutionMetrics({ metrics, isLoading }: SequenceExecutionMetricsProps) {
  const [animatedMetrics, setAnimatedMetrics] = useState(metrics);
  const prevMetricsRef = useRef(metrics);

  // Animate metric changes
  useEffect(() => {
    if (JSON.stringify(prevMetricsRef.current) !== JSON.stringify(metrics)) {
      const duration = 1000; // 1 second animation
      const steps = 20;
      const stepDuration = duration / steps;

      let currentStep = 0;
      const interval = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;

        setAnimatedMetrics({
          total: Math.round(prevMetricsRef.current.total + (metrics.total - prevMetricsRef.current.total) * progress),
          active: Math.round(prevMetricsRef.current.active + (metrics.active - prevMetricsRef.current.active) * progress),
          completed: Math.round(prevMetricsRef.current.completed + (metrics.completed - prevMetricsRef.current.completed) * progress),
          failed: Math.round(prevMetricsRef.current.failed + (metrics.failed - prevMetricsRef.current.failed) * progress),
          paused: Math.round(prevMetricsRef.current.paused + (metrics.paused - prevMetricsRef.current.paused) * progress),
          successRate: metrics.successRate, // Don't animate percentage string
        });

        if (currentStep >= steps) {
          clearInterval(interval);
          setAnimatedMetrics(metrics);
          prevMetricsRef.current = metrics;
        }
      }, stepDuration);

      return () => clearInterval(interval);
    }
  }, [metrics]);

  const metricCards = [
    {
      title: "Total Enrollments",
      value: animatedMetrics.total,
      icon: Users,
      color: "text-primary",
    },
    {
      title: "Active",
      value: animatedMetrics.active,
      icon: Play,
      color: "text-blue-500",
    },
    {
      title: "Completed",
      value: animatedMetrics.completed,
      icon: CheckCircle2,
      color: "text-green-500",
    },
    {
      title: "Failed",
      value: animatedMetrics.failed,
      icon: XCircle,
      color: "text-red-500",
    },
    {
      title: "Paused",
      value: animatedMetrics.paused,
      icon: PauseCircle,
      color: "text-yellow-500",
    },
    {
      title: "Success Rate",
      value: `${animatedMetrics.successRate}%`,
      icon: TrendingUp,
      color: "text-primary",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {metricCards.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {isLoading ? "..." : metric.value}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

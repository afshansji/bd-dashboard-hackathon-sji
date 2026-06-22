import { Target } from "lucide-react";
import { EmptyState } from "./EmptyState";

interface EmptyKPIsProps {
  onAddKPI?: () => void;
}

export function EmptyKPIs({ onAddKPI }: EmptyKPIsProps) {
  return (
    <EmptyState
      icon={Target}
      title="No KPIs Configured"
      description="Add key performance indicators to measure success and track your brand's performance over time."
      primaryAction={
        onAddKPI
          ? {
              label: "Add First KPI",
              onClick: onAddKPI,
            }
          : undefined
      }
      secondaryAction={{
        label: "Browse Templates",
        onClick: () => console.log("Show KPI templates"),
        variant: "ghost",
      }}
    />
  );
}

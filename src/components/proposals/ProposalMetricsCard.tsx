import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Minus, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProposalMetricsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  description?: string;
  trend?: "up" | "down" | "neutral";
  format?: "number" | "percentage" | "currency" | "duration";
}

export function ProposalMetricsCard({
  title,
  value,
  change,
  changeLabel = "vs last period",
  icon: Icon,
  description,
  trend,
  format = "number",
}: ProposalMetricsCardProps) {
  const formattedValue = formatValue(value, format);
  const trendDirection = trend || (change && change > 0 ? "up" : change && change < 0 ? "down" : "neutral");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formattedValue}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {change !== undefined && (
          <div className="flex items-center gap-1 mt-2">
            {trendDirection === "up" && (
              <ArrowUp className="h-3 w-3 text-green-500" />
            )}
            {trendDirection === "down" && (
              <ArrowDown className="h-3 w-3 text-red-500" />
            )}
            {trendDirection === "neutral" && (
              <Minus className="h-3 w-3 text-muted-foreground" />
            )}
            <span
              className={cn(
                "text-xs font-medium",
                trendDirection === "up" && "text-green-500",
                trendDirection === "down" && "text-red-500",
                trendDirection === "neutral" && "text-muted-foreground"
              )}
            >
              {change > 0 ? "+" : ""}
              {change}%
            </span>
            <span className="text-xs text-muted-foreground">{changeLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatValue(value: string | number, format: "number" | "percentage" | "currency" | "duration"): string {
  if (typeof value === "string") return value;

  switch (format) {
    case "percentage":
      return `${value.toFixed(1)}%`;
    case "currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
      }).format(value);
    case "duration":
      return `${value.toFixed(1)} days`;
    default:
      return value.toLocaleString();
  }
}

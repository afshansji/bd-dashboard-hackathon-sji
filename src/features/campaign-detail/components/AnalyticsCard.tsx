import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AnalyticsCardProps {
  title: string;
  value: number | string;
  suffix?: string;
  description?: string | null;
  delta?: number | null;
  timestamp?: string | null;
}

const formatDelta = (delta?: number | null) => {
  if (delta === null || delta === undefined) return null;
  const rounded = Math.round(delta * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
};

const formatTimestamp = (timestamp?: string | null) => {
  if (!timestamp) return null;
  try {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString();
  } catch (error) {
    return null;
  }
};

export function AnalyticsCard({
  title,
  value,
  suffix,
  description,
  delta,
  timestamp,
}: AnalyticsCardProps) {
  const formattedDelta = formatDelta(delta);
  const formattedTimestamp = formatTimestamp(timestamp);
  const isNegative = (delta ?? 0) < 0;

  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {formattedDelta ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
              isNegative ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {isNegative ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
            {formattedDelta}
          </span>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-2xl font-bold">
          {value}
          {suffix ? <span className="ml-1 text-base font-semibold text-muted-foreground">{suffix}</span> : null}
        </div>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        {formattedTimestamp ? (
          <p className="text-xs text-muted-foreground">Last updated {formattedTimestamp}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface KPICardProps {
  label: string;
  value: string | number;
  trend?: { direction: "up" | "down"; value: string };
  icon?: LucideIcon;
  description?: string;
  suffix?: string;
  loading?: boolean;
  className?: string;
}

export function KPICard({ label, value, trend, icon: Icon, description, suffix, loading, className }: KPICardProps) {
  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
          {Icon && (
            <div className="rounded-lg bg-primary/10 p-3">
              <Icon className="h-5 w-5 text-primary opacity-30" />
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("p-6 hover:shadow-md transition-shadow", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold">{value}{suffix}</p>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {Icon && (
          <div className="rounded-lg bg-primary/10 p-3">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-1 text-sm">
          {trend.direction === "up" ? (
            <>
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-green-600">{trend.value}</span>
            </>
          ) : (
            <>
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-red-600">{trend.value}</span>
            </>
          )}
          <span className="text-muted-foreground">from last month</span>
        </div>
      )}
    </Card>
  );
}

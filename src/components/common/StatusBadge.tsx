import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  label?: string;
  variant?: "success" | "warning" | "error" | "info" | "neutral";
  className?: string;
}

export function StatusBadge({ status, label, variant, className }: StatusBadgeProps) {
  const effectiveStatus = variant || status;
  const normalizedStatus = effectiveStatus.toLowerCase();
  
  const getVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    switch (normalizedStatus) {
      case "optimal":
      case "available":
      case "success":
      case "won":
      case "accepted":
        return "default";
      case "warning":
      case "high":
        return "secondary";
      case "critical":
      case "error":
      case "lost":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getColorClass = () => {
    switch (normalizedStatus) {
      case "optimal":
      case "available":
      case "success":
      case "won":
      case "accepted":
        return "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300";
      case "warning":
      case "high":
        return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300";
      case "critical":
      case "error":
      case "lost":
        return "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300";
      case "info":
        return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300";
      default:
        return "";
    }
  };

  return (
    <Badge 
      variant={getVariant()} 
      className={cn("transition-colors", getColorClass(), className)}
    >
      {label || status}
    </Badge>
  );
}

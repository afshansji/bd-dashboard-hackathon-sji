import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string | ReactNode;
  description?: string;
  actions?: ReactNode;
  gradient?: boolean;
  breadcrumbs?: ReactNode;
  stats?: ReactNode;
  className?: string;
  sticky?: boolean;
  icon?: ReactNode;
}

export function PageHeader({ 
  title, 
  description, 
  actions, 
  gradient = false,
  breadcrumbs,
  stats,
  className,
  sticky = false,
  icon,
}: PageHeaderProps) {
  return (
    <div className={cn(
      "rounded-lg w-full",
      sticky
        ? "sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75"
        : "mb-6",
      sticky && "rounded-none",
      gradient && "bg-gradient-to-r from-primary/10 via-primary/5 to-background p-6 border",
      className
    )}>
      {breadcrumbs && <div className="mb-3">{breadcrumbs}</div>}
      
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1">
          {icon && <div className="mb-2">{icon}</div>}
          <h1 className="text-3xl font-semibold text-foreground mb-2">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
          {stats && <div className="mt-4">{stats}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0 sm:mt-0 mt-2">{actions}</div>}
      </div>
    </div>
  );
}

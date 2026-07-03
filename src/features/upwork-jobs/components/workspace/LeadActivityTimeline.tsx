import { format } from "date-fns";
import {
  ArrowDown,
  Bot,
  CalendarCheck,
  Mail,
  MessageSquare,
  Radar,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LeadTimelineEvent } from "../../types/leadWorkspace";

interface LeadActivityTimelineProps {
  events: LeadTimelineEvent[];
  compact?: boolean;
  title?: string;
}

const KIND_ICONS: Record<LeadTimelineEvent["kind"], typeof Radar> = {
  found: Radar,
  analyzed: Bot,
  email: Mail,
  reply: MessageSquare,
  assigned: UserCheck,
  meeting: CalendarCheck,
  status: UserCheck,
  note: MessageSquare,
  custom: MessageSquare,
};

const KIND_STYLES: Record<
  LeadTimelineEvent["kind"],
  { card: string; icon: string; dot: string }
> = {
  found: {
    card: "border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20",
    icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  analyzed: {
    card: "border-violet-200/80 bg-violet-50/50 dark:border-violet-900/50 dark:bg-violet-950/20",
    icon: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    dot: "bg-violet-500",
  },
  email: {
    card: "border-sky-200/80 bg-sky-50/50 dark:border-sky-900/50 dark:bg-sky-950/20",
    icon: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  reply: {
    card: "border-blue-200/80 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20",
    icon: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  assigned: {
    card: "border-indigo-200/80 bg-indigo-50/50 dark:border-indigo-900/50 dark:bg-indigo-950/20",
    icon: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    dot: "bg-indigo-500",
  },
  meeting: {
    card: "border-amber-200/80 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20",
    icon: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  status: {
    card: "border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30",
    icon: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    dot: "bg-slate-400",
  },
  note: {
    card: "border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30",
    icon: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    dot: "bg-slate-400",
  },
  custom: {
    card: "border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30",
    icon: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    dot: "bg-slate-400",
  },
};

function formatEventTime(timestamp: string): string {
  const date = new Date(timestamp);
  return `${format(date, "MMM d")} · ${format(date, "HH:mm")}`;
}

export function LeadActivityTimeline({
  events,
  compact = false,
  title = "AI Lead Timeline",
}: LeadActivityTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="animate-in fade-in-0 duration-300 rounded-xl border border-dashed p-6 text-center">
        <p className="text-sm font-medium text-foreground">No activity yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Assign an owner or run analysis to start the timeline.
        </p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          {events.map((event, index) => {
            const Icon = KIND_ICONS[event.kind];
            return (
              <span key={event.id} className="inline-flex items-center gap-1">
                {index > 0 ? <ArrowDown className="h-3 w-3 rotate-[-90deg]" /> : null}
                <Icon className="h-3 w-3 text-primary" />
                <span>{event.label}</span>
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
      <div className="space-y-1">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        <p className="text-xs text-muted-foreground">
          Every interaction on this lead, in order
        </p>
      </div>

      <div className="flex flex-col items-stretch">
        {events.map((event, index) => {
          const Icon = KIND_ICONS[event.kind];
          const styles = KIND_STYLES[event.kind];
          const isLast = index === events.length - 1;

          return (
            <div
              key={event.id}
              className="flex flex-col items-center animate-in fade-in-0 slide-in-from-left-2 duration-300 fill-mode-both"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div
                className={cn(
                  "w-full rounded-xl border px-4 py-3 shadow-sm transition-shadow hover:shadow-md",
                  styles.card,
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      styles.icon,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-sm font-medium leading-snug">{event.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatEventTime(event.timestamp)}
                    </p>
                  </div>
                  <span
                    className={cn("mt-2 h-2 w-2 shrink-0 rounded-full", styles.dot)}
                    aria-hidden
                  />
                </div>
              </div>

              {!isLast ? (
                <div className="flex flex-col items-center py-1.5 text-muted-foreground/60">
                  <div className="h-3 w-px bg-border" />
                  <ArrowDown className="h-3.5 w-3.5 animate-pulse" />
                  <div className="h-3 w-px bg-border" />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { Badge } from "@/components/ui/badge";
import type { CapabilityAssessmentRow } from "../../types/intelligenceReport";
import {
  coverageBarClass,
  coverageLabelClass,
  importanceBadgeClass,
} from "./reportUtils";

interface CapabilityAssessmentDashboardProps {
  rows: CapabilityAssessmentRow[];
}

export function CapabilityAssessmentDashboard({
  rows,
}: CapabilityAssessmentDashboardProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No capability assessment available.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="hidden grid-cols-[1fr_140px_100px] gap-3 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
        <span>Capability</span>
        <span>Coverage</span>
        <span className="text-right">Assessment</span>
      </div>
      {rows.map((row) => (
        <div key={row.capabilityKey} className="rounded-lg border p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{row.label}</span>
                <Badge
                  variant="outline"
                  className={`text-xs capitalize ${importanceBadgeClass(row.importance)}`}
                >
                  {row.importance}
                </Badge>
              </div>
              {row.repositoryCount > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {row.repositoryCount} supporting project
                  {row.repositoryCount === 1 ? "" : "s"}
                </p>
              ) : null}
            </div>
            <span
              className={`text-sm font-semibold ${coverageLabelClass(row.coverageLabel)}`}
            >
              {row.coverageLabel}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full rounded-full transition-all ${coverageBarClass(row.level)}`}
              style={{ width: `${row.coverage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

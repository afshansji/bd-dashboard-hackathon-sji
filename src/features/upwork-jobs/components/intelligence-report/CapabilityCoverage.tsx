import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { CapabilityCoverageRow } from "../../types/intelligenceReport";
import { coverageBarClass, coverageTextClass } from "./reportUtils";

interface CapabilityCoverageProps {
  rows: CapabilityCoverageRow[];
  onSelectRepository?: (repositoryId: string) => void;
}

export function CapabilityCoverage({
  rows,
  onSelectRepository,
}: CapabilityCoverageProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No capability coverage data available.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="hidden grid-cols-[1fr_120px_80px] gap-3 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
        <span>Capability</span>
        <span>Coverage</span>
        <span className="text-right">Level</span>
      </div>
      {rows.map((row) => {
        const rowKey = `${row.technology}-${row.capability ?? ""}`;
        const isOpen = expanded[rowKey] ?? false;
        const repoCount = row.contributingRepos.length;

        return (
          <Collapsible
            key={rowKey}
            open={isOpen}
            onOpenChange={(open) =>
              setExpanded((prev) => ({ ...prev, [rowKey]: open }))
            }
          >
            <div className="rounded-lg border">
              <CollapsibleTrigger className="flex w-full items-start gap-3 p-3 text-left hover:bg-muted/40">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-medium">{row.technology}</span>
                      {row.capability && row.capability !== row.technology ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          → {row.capability}
                        </span>
                      ) : null}
                    </div>
                    <span
                      className={`text-sm font-semibold tabular-nums ${coverageTextClass(row.level)}`}
                    >
                      {row.coverage}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full rounded-full transition-all ${coverageBarClass(row.level)}`}
                      style={{ width: `${row.coverage}%` }}
                    />
                  </div>
                  {row.matchedEvidence?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {row.matchedEvidence.slice(0, 6).map((evidence) => (
                        <Badge
                          key={evidence}
                          variant="secondary"
                          className="text-xs font-normal"
                        >
                          {evidence}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  <p className="text-xs text-muted-foreground">{row.reason}</p>
                  {repoCount > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {repoCount} repositor{repoCount === 1 ? "y" : "ies"} supporting
                      this capability
                    </p>
                  ) : null}
                </div>
                {repoCount > 0 ? (
                  <ChevronDown
                    className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                ) : null}
              </CollapsibleTrigger>
              {repoCount > 0 ? (
                <CollapsibleContent className="border-t px-3 pb-3 pt-2">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Supporting repositories
                  </p>
                  <div className="space-y-2">
                    {row.contributingRepos.map((repo) => (
                      <button
                        key={repo.repositoryId}
                        type="button"
                        className="block w-full rounded-md border border-transparent px-2 py-1.5 text-left text-sm hover:border-border hover:bg-muted/50"
                        onClick={() => onSelectRepository?.(repo.repositoryId)}
                      >
                        <span className="font-medium text-primary">
                          {repo.repositoryName}
                        </span>
                        {repo.matchingTechnologies.length > 0 ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {repo.matchingTechnologies.slice(0, 5).join(", ")}
                          </span>
                        ) : null}
                        {repo.matchedFiles.length > 0 ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {repo.matchedFiles.slice(0, 3).join(", ")}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </CollapsibleContent>
              ) : null}
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
}

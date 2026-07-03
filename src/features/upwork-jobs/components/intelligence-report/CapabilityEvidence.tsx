import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import type { CapabilityEvidenceItem } from "../../types/intelligenceReport";
import { coverageLabelClass } from "./reportUtils";

interface CapabilityEvidenceProps {
  items: CapabilityEvidenceItem[];
  onSelectRepository?: (repositoryId: string) => void;
}

export function CapabilityEvidence({
  items,
  onSelectRepository,
}: CapabilityEvidenceProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No grouped capability evidence found in indexed repositories.
      </p>
    );
  }

  return (
    <Accordion type="multiple" className="space-y-2">
      {items.map((item) => {
        const projects = item.supportingProjects?.length
          ? item.supportingProjects
          : (item.repositories ?? []).map((repo) => ({
              repositoryId: repo.repositoryId,
              repositoryName: repo.repositoryName,
              repositoryUrl: repo.repositoryUrl,
              classification: repo.classification ?? "internal_product",
              classificationLabel: "Internal Product",
              qualityWeight: repo.qualityWeight ?? 0.5,
              relevantBecause: repo.relevantBecause ?? [],
              notRelevant: repo.notRelevant ?? [],
              matchingTechnologies: repo.matchingTechnologies,
            }));

        return (
          <AccordionItem
            key={item.capabilityKey ?? item.label}
            value={item.capabilityKey ?? item.label}
            className="rounded-lg border px-4"
          >
            <AccordionTrigger className="hover:no-underline">
              <div className="flex flex-1 flex-wrap items-center gap-2 text-left">
                <span className="font-semibold">{item.label}</span>
                <span
                  className={`text-sm font-medium ${coverageLabelClass(item.coverageLabel ?? "Unknown")}`}
                >
                  {item.coverageLabel ?? "Unknown"}
                </span>
                <Badge variant="secondary">
                  {item.repositoryCount} supporting project
                  {item.repositoryCount === 1 ? "" : "s"}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              {item.evidenceLabels.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {item.evidenceLabels.map((label) => (
                    <Badge key={label} variant="outline">
                      {label}
                    </Badge>
                  ))}
                </div>
              ) : null}
              <div className="space-y-3">
                {projects.map((project) => (
                  <div
                    key={project.repositoryId}
                    className="rounded-md border bg-muted/30 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        className="font-medium text-primary hover:underline"
                        onClick={() => onSelectRepository?.(project.repositoryId)}
                      >
                        {project.repositoryName}
                      </button>
                      <Badge variant="outline" className="text-xs">
                        {project.classificationLabel}
                      </Badge>
                    </div>
                    {project.relevantBecause.length > 0 ? (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-medium uppercase text-muted-foreground">
                          Relevant because
                        </p>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {project.relevantBecause.map((reason) => (
                            <li key={reason} className="flex gap-2">
                              <span className="text-emerald-600">✓</span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {project.notRelevant.length > 0 ? (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-medium uppercase text-muted-foreground">
                          Not relevant
                        </p>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {project.notRelevant.map((reason) => (
                            <li key={reason} className="flex gap-2">
                              <span className="text-orange-600">✗</span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

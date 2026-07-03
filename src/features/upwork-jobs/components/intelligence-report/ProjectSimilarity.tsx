import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SimilarProjectCard } from "../../types/intelligenceReport";

interface ProjectSimilarityProps {
  projects: SimilarProjectCard[];
}

export function ProjectSimilarity({ projects }: ProjectSimilarityProps) {
  if (projects.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No similar internal projects were identified from indexed organizational memory.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      {projects.map((project) => (
        <Card key={project.projectId}>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">
                  {project.repositoryUrl ? (
                    <a
                      href={project.repositoryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary hover:underline"
                    >
                      {project.repositoryName}
                    </a>
                  ) : (
                    project.repositoryName
                  )}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {project.businessDomain}
                </p>
              </div>
              <Badge className="shrink-0">{project.matchPercentage}% Match</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">{project.summary}</p>
            {project.matchReasons.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {project.matchReasons.map((reason) => (
                  <Badge key={reason} variant="secondary" className="text-xs">
                    {reason}
                  </Badge>
                ))}
              </div>
            ) : null}
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Business value: </span>
              {project.businessValue}
            </p>
            <Accordion type="single" collapsible>
              <AccordionItem value="details" className="border-none">
                <AccordionTrigger className="py-2 text-sm hover:no-underline">
                  View matched evidence
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  {project.technologyStack.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {project.technologyStack.map((tech) => (
                        <Badge key={tech} variant="outline" className="text-xs">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  {project.matchedFiles.length > 0 ? (
                    <div>
                      <p className="text-xs font-medium uppercase text-muted-foreground">
                        Matched files
                      </p>
                      <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
                        {project.matchedFiles.map((file) => (
                          <li key={file}>{file}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {project.relevantSnippets.map((snippet, index) => (
                    <div
                      key={`${project.projectId}-snippet-${index}`}
                      className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground"
                    >
                      {snippet.slice(0, 280)}
                      {snippet.length > 280 ? "..." : ""}
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

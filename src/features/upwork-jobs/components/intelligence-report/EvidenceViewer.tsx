import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { EvidenceClaim, EvidenceScope } from "../../types/intelligenceReport";

const VISIBLE_REPO_LIMIT = 8;

interface EvidenceViewerProps {
  claims: EvidenceClaim[];
  evidenceScope?: EvidenceScope;
  onSelectRepository?: (repositoryId: string) => void;
}

export function EvidenceViewer({
  claims,
  evidenceScope,
  onSelectRepository,
}: EvidenceViewerProps) {
  if (claims.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No evidence-backed claims were generated for this analysis.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {evidenceScope ? (
        <p className="text-sm text-muted-foreground">
          Scanned {evidenceScope.reposScannedForEvidence} of{" "}
          {evidenceScope.totalIndexedRepos} indexed repositories for evidence
          (top {evidenceScope.jobRelevantRepos} used for job-fit scoring).
        </p>
      ) : null}
      <div className="grid gap-3">
        {claims.map((claim) => {
          const visibleNames = claim.repositoryNames.slice(0, VISIBLE_REPO_LIMIT);
          const hiddenCount = Math.max(
            0,
            claim.repositoryCount - visibleNames.length,
          );

          return (
            <Card key={claim.claim}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{claim.claim}</p>
                  <p className="text-sm text-muted-foreground">
                    Evidence: {claim.repositoryCount} repositories
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {visibleNames.map((name, index) => (
                    <button
                      key={`${claim.claim}-${name}`}
                      type="button"
                      onClick={() =>
                        onSelectRepository?.(claim.repositoryIds[index] ?? "")
                      }
                    >
                      <Badge
                        variant="secondary"
                        className="cursor-pointer hover:bg-secondary/80"
                      >
                        {name}
                      </Badge>
                    </button>
                  ))}
                  {hiddenCount > 0 ? (
                    <Badge variant="outline" className="text-muted-foreground">
                      +{hiddenCount} more
                    </Badge>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

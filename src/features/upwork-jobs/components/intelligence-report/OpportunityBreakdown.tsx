import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OpportunityBreakdown } from "../../types/intelligenceReport";

interface OpportunityBreakdownProps {
  breakdown: OpportunityBreakdown;
}

function BreakdownCard({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  if (!value) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm font-medium">{value}</CardContent>
    </Card>
  );
}

export function OpportunityBreakdownSection({
  breakdown,
}: OpportunityBreakdownProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <BreakdownCard label="Project Type" value={breakdown.projectType} />
        <BreakdownCard label="Industry" value={breakdown.industry} />
        <BreakdownCard label="Budget" value={breakdown.budget} />
        <BreakdownCard label="Timeline" value={breakdown.timeline} />
        <BreakdownCard label="Client Country" value={breakdown.clientCountry} />
        <BreakdownCard
          label="Required Experience"
          value={breakdown.requiredExperience}
        />
        <BreakdownCard label="Seniority" value={breakdown.seniority} />
      </div>
      {breakdown.requiredTechnologies.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Required Technologies
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {breakdown.requiredTechnologies.map((tech) => (
              <Badge key={tech} variant="secondary">
                {tech}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

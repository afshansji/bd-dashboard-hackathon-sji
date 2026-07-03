import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { EngineeringComplexity } from "../../types/intelligenceReport";
import { formatComplexity } from "./reportUtils";

interface EngineeringComplexityProps {
  complexity: EngineeringComplexity;
}

const LEVEL_STYLES = {
  low: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-900",
  high: "bg-red-100 text-red-800",
} as const;

export function EngineeringComplexitySection({
  complexity,
}: EngineeringComplexityProps) {
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Estimated complexity</span>
          <Badge className={LEVEL_STYLES[complexity.level]}>
            {formatComplexity(complexity.level)}
          </Badge>
        </div>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          {complexity.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

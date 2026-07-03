import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SkillGapAnalysis } from "../../types/intelligenceReport";

interface SkillGapAnalysisProps {
  analysis: SkillGapAnalysis;
}

function GapColumn({
  title,
  items,
  accentClass,
}: {
  title: string;
  items: { label: string; reason: string }[];
  accentClass: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className={`text-sm font-semibold ${accentClass}`}>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">None identified.</p>
        ) : (
          items.map((item) => (
            <div key={item.label}>
              <p className="font-medium">{item.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function SkillGapAnalysisSection({ analysis }: SkillGapAnalysisProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <GapColumn
        title="Strong Coverage"
        items={analysis.strong}
        accentClass="text-emerald-700"
      />
      <GapColumn
        title="Moderate Coverage"
        items={analysis.moderate}
        accentClass="text-amber-700"
      />
      <GapColumn
        title="Weak Coverage"
        items={analysis.weak}
        accentClass="text-red-700"
      />
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BusinessRecommendation } from "../../types/intelligenceReport";

interface BusinessRecommendationProps {
  recommendation: BusinessRecommendation;
}

function BulletList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function BusinessRecommendationSection({
  recommendation,
}: BusinessRecommendationProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <BulletList title="Reasons to Pursue" items={recommendation.reasonsToPursue} />
      <BulletList title="Reasons for Caution" items={recommendation.reasonsForCaution} />
      <BulletList
        title="Questions to Clarify During Discovery Call"
        items={recommendation.discoveryQuestions}
      />
      <BulletList
        title="Potential Upsell Opportunities"
        items={recommendation.upsellOpportunities}
      />
      <BulletList
        title="Possible Future Services"
        items={recommendation.futureServices}
      />
    </div>
  );
}

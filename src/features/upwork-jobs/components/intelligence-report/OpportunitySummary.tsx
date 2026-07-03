import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type {
  DeliveryAssessment,
  OpportunityIntelligenceReport,
} from "../../types/intelligenceReport";
import { formatDelivery, RECOMMENDATION_META } from "./reportUtils";

interface OpportunitySummaryProps {
  summary: OpportunityIntelligenceReport["executiveSummary"];
  delivery?: DeliveryAssessment;
}

export function OpportunitySummary({ summary, delivery }: OpportunitySummaryProps) {
  const meta = RECOMMENDATION_META[summary.recommendation];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className={meta.badgeClass}>
            {meta.label}
          </Badge>
          {delivery ? (
            <Badge variant="secondary">
              Delivery: {formatDelivery(delivery.level)}
            </Badge>
          ) : null}
          <div className="text-sm text-muted-foreground">
            Overall confidence
          </div>
          <div className="text-2xl font-bold tabular-nums">
            {summary.confidence}%
          </div>
        </div>
        {delivery ? (
          <p className="text-base font-medium leading-relaxed">
            {delivery.headline}
          </p>
        ) : null}
        <p className="text-sm leading-relaxed text-muted-foreground">
          {summary.summary}
        </p>
      </CardContent>
    </Card>
  );
}

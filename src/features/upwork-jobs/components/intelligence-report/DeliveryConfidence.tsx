import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { DeliveryAssessment, DeliveryConfidence } from "../../types/intelligenceReport";
import { formatDelivery } from "./reportUtils";

interface DeliveryConfidenceProps {
  delivery: DeliveryConfidence;
  assessment?: DeliveryAssessment;
}

const LEVEL_STYLES = {
  very_high: "bg-emerald-100 text-emerald-800",
  high: "bg-emerald-50 text-emerald-700",
  medium: "bg-amber-100 text-amber-900",
  low: "bg-red-100 text-red-800",
} as const;

export function DeliveryConfidenceSection({
  delivery,
  assessment,
}: DeliveryConfidenceProps) {
  const headline = assessment?.headline ?? delivery.explanation;
  const reasons = assessment?.reasons ?? delivery.reasons ?? [];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-foreground">
            Overall Delivery Confidence
          </span>
          <Badge className={LEVEL_STYLES[delivery.level]}>
            {formatDelivery(delivery.level)}
          </Badge>
        </div>
        <p className="text-base font-medium leading-relaxed">{headline}</p>
        {reasons.length > 0 ? (
          <ul className="space-y-2 text-sm text-muted-foreground">
            {reasons.map((reason) => (
              <li key={reason} className="flex gap-2">
                <span className="text-emerald-600">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}

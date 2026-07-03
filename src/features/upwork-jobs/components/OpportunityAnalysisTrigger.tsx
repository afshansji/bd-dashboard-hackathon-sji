import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils";
import type { OpportunityRecommendation } from "../types/opportunityAnalysis";
import { RECOMMENDATION_META } from "./intelligence-report/reportUtils";

interface OpportunityAnalysisTriggerProps {
  hasAnalysis: boolean;
  analyzedAt: string | null;
  recommendation: OpportunityRecommendation | null;
  confidence: number | null;
  isAnalyzing: boolean;
  onAnalyze: () => void;
}

export function OpportunityAnalysisTrigger({
  hasAnalysis,
  analyzedAt,
  recommendation,
  confidence,
  isAnalyzing,
  onAnalyze,
}: OpportunityAnalysisTriggerProps) {
  const meta = recommendation ? RECOMMENDATION_META[recommendation] : null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-t pt-4">
      <Button size="sm" variant="secondary" onClick={onAnalyze} disabled={isAnalyzing}>
        {isAnalyzing ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="mr-2 h-4 w-4" />
        )}
        {hasAnalysis ? "View Opportunity" : "Analyze Opportunity"}
      </Button>
      {hasAnalysis && meta ? (
        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${meta.badgeClass}`}>
          {meta.label}
          {confidence != null ? ` · ${confidence}%` : ""}
        </span>
      ) : null}
      {analyzedAt ? (
        <span className="text-xs text-muted-foreground">
          Analyzed {formatRelativeTime(analyzedAt)}
        </span>
      ) : null}
    </div>
  );
}

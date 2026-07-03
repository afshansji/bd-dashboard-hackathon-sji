import type {
  CapabilityAssessmentRow,
  CoverageLabel,
  CoverageLevel,
  ComplexityLevel,
  DeliveryLevel,
} from "../../types/intelligenceReport";

export function coverageBarClass(level: CoverageLevel): string {
  switch (level) {
    case "strong":
      return "bg-emerald-500";
    case "moderate":
      return "bg-amber-500";
    case "weak":
      return "bg-orange-500";
    case "unknown":
      return "bg-slate-400";
    default:
      return "bg-red-500";
  }
}

export function coverageTextClass(level: CoverageLevel): string {
  switch (level) {
    case "strong":
      return "text-emerald-700";
    case "moderate":
      return "text-amber-700";
    case "weak":
      return "text-orange-700";
    case "unknown":
      return "text-slate-600";
    default:
      return "text-red-700";
  }
}

export function coverageLabelClass(label: CoverageLabel): string {
  switch (label) {
    case "Excellent":
    case "Strong":
      return "text-emerald-700";
    case "Moderate":
      return "text-amber-700";
    case "Weak":
      return "text-orange-700";
    default:
      return "text-slate-600";
  }
}

export function importanceBadgeClass(
  importance: CapabilityAssessmentRow["importance"],
): string {
  switch (importance) {
    case "critical":
      return "bg-red-100 text-red-800";
    case "high":
      return "bg-orange-100 text-orange-800";
    case "medium":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function formatComplexity(level: ComplexityLevel): string {
  return level.charAt(0).toUpperCase() + level.slice(1);
}

export function formatDelivery(level: DeliveryLevel): string {
  return level
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export const RECOMMENDATION_META = {
  PURSUE: {
    label: "Pursue",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  REVIEW: {
    label: "Review",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-200",
  },
  IGNORE: {
    label: "Ignore",
    badgeClass: "bg-red-100 text-red-800 border-red-200",
  },
} as const;

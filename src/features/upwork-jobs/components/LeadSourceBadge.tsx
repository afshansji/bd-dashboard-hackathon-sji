import { Badge } from "@/components/ui/badge";
import {
  JOB_LEAD_SOURCE_LABELS,
  JOB_LEAD_SOURCE_STYLES,
  getJobLeadSourceLabel,
  getJobLeadSourceStyle,
  type JobLeadSource,
} from "../constants/sources";

interface LeadSourceBadgeProps {
  source: string;
  jobUrl?: string | null;
}

export function LeadSourceBadge({ source, jobUrl }: LeadSourceBadgeProps) {
  return (
    <Badge variant="outline" className={getJobLeadSourceStyle(source, jobUrl)}>
      {getJobLeadSourceLabel(source, jobUrl)}
    </Badge>
  );
}

export function LeadSourceBadgeFromId({ source }: { source: JobLeadSource }) {
  return (
    <Badge variant="outline" className={JOB_LEAD_SOURCE_STYLES[source]}>
      {JOB_LEAD_SOURCE_LABELS[source]}
    </Badge>
  );
}

export { JOB_LEAD_SOURCE_LABELS };

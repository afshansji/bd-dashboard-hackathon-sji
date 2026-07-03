import { useMutation } from "@tanstack/react-query";
import {
  generateJobLeadOutreach,
  type JobLeadOutreachType,
} from "@/features/upwork-jobs/api/jobLeadOutreach";

export function useJobLeadOutreach(jobId: string) {
  return useMutation({
    mutationKey: ["job-lead-outreach", jobId],
    mutationFn: (type: JobLeadOutreachType) => generateJobLeadOutreach(jobId, type),
  });
}

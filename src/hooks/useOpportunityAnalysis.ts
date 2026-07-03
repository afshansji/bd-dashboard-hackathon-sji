import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { opportunityIntelligenceApi } from "@/features/upwork-jobs/api/opportunityIntelligence";
import type { OpportunityAnalysisResponse } from "@/features/upwork-jobs/types/opportunityAnalysis";

export function useOpportunityAnalysis(jobId: string) {
  return useQuery({
    queryKey: ["opportunity-analysis", jobId],
    queryFn: async (): Promise<OpportunityAnalysisResponse | null> => {
      const data = await opportunityIntelligenceApi.getAnalysis(jobId);
      if (!data.analysis) return null;
      return data as OpportunityAnalysisResponse;
    },
    staleTime: 60_000,
  });
}

export function useAnalyzeOpportunity(jobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (force = false) => {
      return opportunityIntelligenceApi.analyzeJob(jobId, force);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["opportunity-analysis", jobId], data);
    },
  });
}

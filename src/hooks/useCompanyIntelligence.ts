import { useMutation, useQuery, useQueryClient, useIsMutating } from "@tanstack/react-query";
import { companyIntelligenceApi } from "@/features/upwork-jobs/api/companyIntelligence";
import type { CompanyIntelligenceResponse } from "@/features/upwork-jobs/types/companyIntelligence";

export function useCompanyIntelligence(jobId: string) {
  return useQuery({
    queryKey: ["company-intelligence", jobId],
    queryFn: async (): Promise<CompanyIntelligenceResponse | null> => {
      const data = await companyIntelligenceApi.getReport(jobId);
      if (!data.report) return null;
      return data as CompanyIntelligenceResponse;
    },
    staleTime: 60_000,
  });
}

export function useResearchCompany(jobId: string) {
  const queryClient = useQueryClient();
  const isResearching =
    useIsMutating({ mutationKey: ["research-company", jobId] }) > 0;

  const mutation = useMutation({
    mutationKey: ["research-company", jobId],
    mutationFn: async ({
      companyWebsite,
      force = false,
    }: {
      companyWebsite: string;
      force?: boolean;
    }) => {
      return companyIntelligenceApi.researchCompany(jobId, companyWebsite, force);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["company-intelligence", jobId], data);
    },
  });

  return { ...mutation, isPending: mutation.isPending || isResearching };
}

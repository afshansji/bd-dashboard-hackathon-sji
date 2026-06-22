import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosPrivate from "@/lib/axiosPrivate";
import { useToast } from "@/hooks/use-toast";
import { EXA_LEADS_QUERY_KEY } from "@/hooks/useLeads";

export interface ExaImportCriteria {
  query: string;
  industries?: string[];
  locations?: string[];
  limit?: number;
  filters?: Record<string, unknown>;
}

export interface ExaImportResponse {
  jobId?: string;
  imported?: number;
  message?: string;
}

export interface LeadEnrichmentVariables {
  leadId: string;
}

export interface LeadEnrichmentResponse {
  leadId: string;
  status: string;
  metadata?: Record<string, unknown> | null;
  last_enriched_at?: string | null;
}

export interface CampaignResearchVariables {
  campaignId: string;
  refresh?: boolean;
}

export interface CampaignResearchResponse {
  campaignId: string;
  status: string;
  reportUrl?: string | null;
  message?: string;
}

export interface CampaignLeadImportVariables {
  campaignId: string;
  keywords: string[];
  maxResults: number;
  filters?: Record<string, unknown>;
}

export interface CampaignLeadImportResponse {
  success: boolean;
  imported: number;
  updated: number;
  skipped: number;
  estimatedCost: number;
  message: string;
}

const LEAD_DETAIL_KEY = "lead-detail";

export const useExaIntegration = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const importMutation = useMutation({
    mutationFn: async (criteria: ExaImportCriteria) => {
      const { data } = await axiosPrivate.post<ExaImportResponse>("/exa/import-leads", criteria);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [EXA_LEADS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["control-tower-leads"] });
      toast({
        title: "Import started",
        description: data?.message ?? "Exa import job queued successfully.",
      });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unable to import leads from Exa.";
      toast({
        title: "Import failed",
        description: message,
        variant: "destructive",
      });
      throw error;
    },
  });

  const enrichMutation = useMutation({
    mutationFn: async ({ leadId }: LeadEnrichmentVariables) => {
      const { data } = await axiosPrivate.post<LeadEnrichmentResponse>(
        `/exa/leads/${leadId}/enrich`,
      );
      return data;
    },
    onMutate: async ({ leadId }) => {
      const queryKey = [LEAD_DETAIL_KEY, leadId];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Record<string, unknown>>(queryKey);

      if (previous) {
        queryClient.setQueryData(queryKey, {
          ...previous,
          enrichment_status: "running",
          metadata: previous["metadata"] ?? null,
        });
      }

      return { previous };
    },
    onError: (error: unknown, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData([LEAD_DETAIL_KEY, variables.leadId], context.previous);
      }
      const message = error instanceof Error ? error.message : "Unable to enrich lead.";
      toast({
        title: "Enrichment failed",
        description: message,
        variant: "destructive",
      });
      throw error;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [LEAD_DETAIL_KEY, variables.leadId] });
      queryClient.invalidateQueries({ queryKey: [EXA_LEADS_QUERY_KEY] });
      toast({
        title: "Lead enriched",
        description: data?.status ?? "The lead enrichment request completed.",
      });
    },
  });

  const researchMutation = useMutation({
    mutationFn: async ({ campaignId, refresh }: CampaignResearchVariables) => {
      const { data } = await axiosPrivate.post<CampaignResearchResponse>(
        `/campaigns/${campaignId}/run-research`,
        refresh ? { refresh } : undefined,
      );
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-campaign-detail", variables.campaignId] });
      toast({
        title: "Research requested",
        description: data?.message ?? "Campaign research job started.",
      });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unable to start campaign research.";
      toast({
        title: "Research failed",
        description: message,
        variant: "destructive",
      });
      throw error;
    },
  });

  const importCampaignLeadsMutation = useMutation({
    mutationFn: async (variables: CampaignLeadImportVariables) => {
      const { data } = await axiosPrivate.post<CampaignLeadImportResponse>(
        `/exa/campaign-lead-import`,
        variables,
      );
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-campaign-detail", variables.campaignId] });
      toast({
        title: "Import complete",
        description: `Imported ${data.imported} new contacts, updated ${data.updated} existing`,
      });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Lead import failed";
      toast({
        title: "Import failed",
        description: message,
        variant: "destructive",
      });
      throw error;
    },
  });

  return {
    importFromExa: importMutation.mutateAsync,
    isImporting: importMutation.isPending,
    enrichLead: enrichMutation.mutateAsync,
    isEnriching: enrichMutation.isPending,
    runCampaignResearch: researchMutation.mutateAsync,
    isRunningResearch: researchMutation.isPending,
    importCampaignLeads: importCampaignLeadsMutation.mutateAsync,
    isImportingCampaignLeads: importCampaignLeadsMutation.isPending,
  };
};


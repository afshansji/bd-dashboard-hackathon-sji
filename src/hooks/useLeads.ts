import { useQuery } from "@tanstack/react-query";
import axiosPrivate from "@/lib/axiosPrivate";

export interface LeadRecord {
  id: string;
  slug: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  status?: string | null;
  source?: string | null;
  owner_id?: string | null;
  owner_name?: string | null;
  enrichment_status?: string | null;
  last_enriched_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface LeadListResponse {
  leads: LeadRecord[];
  total?: number;
  page?: number;
  pageSize?: number;
}

export interface LeadListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}

export interface LeadDetailResponse {
  lead: LeadRecord;
}

export const EXA_LEADS_QUERY_KEY = "exa-leads";

export const useLeadList = (params: LeadListParams = {}) => {
  return useQuery({
    queryKey: [EXA_LEADS_QUERY_KEY, params],
    queryFn: async () => {
      const { data } = await axiosPrivate.get<LeadListResponse>("/exa/leads", { 
        params: params as Record<string, string | number | boolean | undefined>
      });
      return {
        leads: data.leads ?? [],
        total: data.total ?? data.leads?.length ?? 0,
        page: data.page ?? params.page ?? 1,
        pageSize: data.pageSize ?? params.pageSize ?? 25,
      };
    },
  });
};

export const useLeadDetail = (leadId?: string) => {
  return useQuery({
    queryKey: ["lead-detail", leadId],
    enabled: Boolean(leadId),
    queryFn: async () => {
      const { data } = await axiosPrivate.get<LeadDetailResponse>(`/exa/leads/${leadId}`);
      if ('id' in data && data.id) {
        return data as unknown as LeadRecord;
      }
      return data.lead;
    },
  });
};


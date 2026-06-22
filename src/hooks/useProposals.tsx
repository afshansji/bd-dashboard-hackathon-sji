import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { ProposalDocument } from "@/types/proposal";

interface ProposalFilters {
  dealId?: string;
  clientId?: string;
  status?: string;
}

export const useProposals = (filters?: ProposalFilters) => {
  return useQuery({
    queryKey: ["proposals", filters],
    queryFn: async () => {
      let query = supabase
        .from("proposal_documents")
        .select(`
          *,
          deal:deals(id, title),
          client:clients(id, name)
        `)
        .order("created_at", { ascending: false });

      if (filters?.dealId) {
        query = query.eq("deal_id", filters.dealId);
      }
      if (filters?.clientId) {
        query = query.eq("client_id", filters.clientId);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as ProposalDocument[];
    },
  });
};

export const useProposalByPandaDocId = (docId?: string) => {
  return useQuery({
    queryKey: ["proposal", docId],
    queryFn: async () => {
      if (!docId) return null;

      const { data, error } = await supabase
        .from("proposal_documents")
        .select(`
          *,
          deal:deals(id, title),
          client:clients(id, name)
        `)
        .eq("pandadoc_doc_id", docId)
        .maybeSingle();

      if (error) throw error;
      return data as ProposalDocument | null;
    },
    enabled: !!docId,
  });
};

export const useCreateProposal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dealId,
      clientId,
      templateId,
      title,
    }: {
      dealId: string;
      clientId: string;
      templateId: string;
      title: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("pandadoc-manage/create-proposal", {
        method: "POST",
        body: {
          dealId,
          clientId,
          templateId,
          title,
        },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to create proposal");

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast({
        title: "Proposal Created",
        description: "Your proposal has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useSendProposal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ docId, message }: { docId: string; message?: string }) => {
      const { data, error } = await supabase.functions.invoke(`pandadoc-manage/send/${docId}`, {
        method: "POST",
        body: message ? { message } : {},
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to send proposal");

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast({
        title: "Proposal Sent",
        description: "Your proposal has been sent to the client.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Send Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteProposal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ proposalId }: { proposalId: string }) => {
      const { data, error } = await supabase.functions.invoke(`pandadoc-manage/delete/${proposalId}`, {
        method: "DELETE",
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to delete proposal");

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast({
        title: "Proposal Deleted",
        description: "Draft proposal deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useProposalStatus = (docId?: string) => {
  return useQuery({
    queryKey: ["proposal-status", docId],
    queryFn: async () => {
      if (!docId) return null;

      const { data, error } = await supabase.functions.invoke(`pandadoc-manage/status/${docId}`, {
        method: "GET",
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to fetch proposal status");

      return data.status;
    },
    enabled: !!docId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

export const useProposalEmbedUrl = (docId?: string, enabled = false) => {
  return useQuery({
    queryKey: ["proposal-embed", docId],
    queryFn: async () => {
      if (!docId) return null;

      const { data, error } = await supabase.functions.invoke(`pandadoc-manage/embed-url/${docId}`, {
        method: "GET",
      });

      if (error) throw error;
      if (!data?.url) throw new Error(data?.error || "Failed to get embed URL");

      return data.url as string;
    },
    enabled: enabled && !!docId,
    staleTime: 1000 * 60 * 30, // 30 minutes
    retry: false, // Don't retry on errors (prevents rate limiting)
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });
};

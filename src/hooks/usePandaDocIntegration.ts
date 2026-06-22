import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { PandaDocIntegration, PandaDocTemplate } from "@/types/proposal";

export const usePandaDocIntegration = () => {
  return useQuery({
    queryKey: ["pandadoc-integration"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("pandadoc-manage/integration", {
        method: "GET",
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to fetch PandaDoc integration");

      return data.integration as PandaDocIntegration | null;
    },
  });
};

export const useConnectPandaDoc = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ apiKey, workspaceId }: { apiKey: string; workspaceId?: string }) => {
      const { data, error } = await supabase.functions.invoke("pandadoc-manage/integration", {
        method: "POST",
        body: { api_key: apiKey, workspace_id: workspaceId },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to connect PandaDoc");

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pandadoc-integration"] });
      toast({
        title: "PandaDoc Connected",
        description: "Your PandaDoc account has been successfully connected.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useDisconnectPandaDoc = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("pandadoc-manage/integration", {
        method: "DELETE",
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to disconnect PandaDoc");

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pandadoc-integration"] });
      queryClient.invalidateQueries({ queryKey: ["pandadoc-templates"] });
      toast({
        title: "PandaDoc Disconnected",
        description: "Your PandaDoc account has been disconnected.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Disconnect Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const usePandaDocTemplates = () => {
  return useQuery({
    queryKey: ["pandadoc-templates"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("pandadoc-manage/templates", {
        method: "GET",
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to fetch templates");

      return (data.templates || []) as PandaDocTemplate[];
    },
  });
};

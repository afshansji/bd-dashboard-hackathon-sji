import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface PushLeadToGHLParams {
  leadId: string;
}

interface PushLeadToGHLResponse {
  ok: boolean;
  action?: "created" | "updated" | "linked";
  ghlContactId?: string;
  opportunityId?: string;
  opportunityCreated?: boolean;
  message?: string;
  error?: string;
}

export const usePushLeadToGHL = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId }: PushLeadToGHLParams) => {
      const { data, error } = await supabase.functions.invoke<PushLeadToGHLResponse>(
        "gohighlevel-manage/push-lead",
        {
          body: { leadId },
        }
      );

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to push lead to GoHighLevel");

      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message || "Lead synced to Leadslift CRM",
      });
      queryClient.invalidateQueries({ queryKey: ["lead-by-slug"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (error: Error) => {
      const errorMessage = error.message || "Failed to sync lead to Leadslift CRM";
      toast({
        title: "Unable to sync lead",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
};

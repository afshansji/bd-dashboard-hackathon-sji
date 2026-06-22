import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface PushClientToGHLParams {
  clientId: string;
}

interface PushClientToGHLResponse {
  ok: boolean;
  action?: "created" | "updated" | "linked";
  ghlContactId?: string;
  opportunityId?: string;
  opportunityCreated?: boolean;
  message?: string;
  error?: string;
}

export const usePushClientToGHL = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId }: PushClientToGHLParams) => {
      const { data, error } = await supabase.functions.invoke<PushClientToGHLResponse>(
        "gohighlevel-manage/push-client",
        {
          body: { clientId },
        }
      );

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to push client to GoHighLevel");

      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message || "Client synced to Leadslift CRM",
      });
      queryClient.invalidateQueries({ queryKey: ["client-by-slug"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (error: Error) => {
      const errorMessage = error.message || "Failed to sync client to Leadslift CRM";
      toast({
        title: "Unable to sync client",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
};

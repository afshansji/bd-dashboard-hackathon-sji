import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCampaignContactUpdate } from "./useCampaignContactUpdate";

interface RunCampaignAgentParams {
  agentId: string;
  contactId: string;
  contactSlug: string;
  executionContext: Record<string, any>;
}

export function useRunCampaignAgent() {
  const queryClient = useQueryClient();
  const updateContact = useCampaignContactUpdate();

  return useMutation({
    mutationFn: async (params: RunCampaignAgentParams) => {
      const { data, error } = await supabase.functions.invoke('run-ai-agent', {
        body: {
          agent_id: params.agentId,
          execution_context: params.executionContext,
        },
      });

      if (error) {
        console.error('Agent execution error:', error);
        throw error;
      }

      return data;
    },
    onSuccess: async (data, variables) => {
      toast.success("AI analysis complete", {
        description: "Contact research has been analyzed",
      });

      // Auto-update status to 'researched' if currently 'identified'
      const { data: contact } = await supabase
        .from("campaign_contacts")
        .select("status")
        .eq("id", variables.contactId)
        .single();

      if (contact?.status === "identified") {
        await updateContact.mutateAsync({
          contactId: variables.contactId,
          updates: { status: "researched" }
        });
        
        toast.success("Status updated", {
          description: "Contact status automatically updated to Researched ✓",
        });
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['ai-agent-runs', variables.agentId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-contact-by-slug', variables.contactSlug] });
      queryClient.invalidateQueries({ queryKey: ['campaign-contacts'] });
    },
    onError: (error: any) => {
      console.error('Agent run failed:', error);
      toast.error("Analysis failed", {
        description: error.message || "Failed to analyze contact. Please try again.",
      });
    },
  });
}

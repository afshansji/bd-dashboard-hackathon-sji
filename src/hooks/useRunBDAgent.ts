import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RunBDAgentParams {
  agentId: string;
  dealId: string;
  dealTitle: string;
  clientName?: string;
  dealStage?: string;
  fileIds: string[];
  userContext: string;
}

export function useRunBDAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: RunBDAgentParams) => {
      const { data, error } = await supabase.functions.invoke('run-ai-agent', {
        body: {
          agent_id: params.agentId,
          execution_context: {
            deal_id: params.dealId,
            deal_title: params.dealTitle,
            client_name: params.clientName,
            deal_stage: params.dealStage,
          },
          file_ids: params.fileIds,
          user_context: params.userContext,
        },
      });

      if (error) {
        console.error('Agent execution error:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data, variables) => {
      toast.success("Analysis complete", {
        description: "AI agent has finished analyzing your documents",
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['ai-agent-runs', variables.agentId] });
      queryClient.invalidateQueries({ queryKey: ['deal-files', variables.dealId] });
    },
    onError: (error: any) => {
      console.error('Agent run failed:', error);
      toast.error("Analysis failed", {
        description: error.message || "Failed to analyze documents. Please try again.",
      });
    },
  });
}

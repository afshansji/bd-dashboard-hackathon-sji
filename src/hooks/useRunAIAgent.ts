import { useMutation, useQueryClient } from "@tanstack/react-query";
import { triggerAgentRun, type AgentRunPayload, type AgentRunResponse } from "@/Api/aiAgents";
import { useAuth } from "@/hooks/useAuth";
import { logUserActivity } from "@/services/userActivityService";

export function useRunAIAgent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (payload: AgentRunPayload): Promise<AgentRunResponse> => triggerAgentRun(payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ai-agent-runs"] });
      queryClient.invalidateQueries({ queryKey: ["ai-agents"] });
      if (user?.id) {
        void logUserActivity({
          userId: user.id,
          action: 'ai_agent_run',
          resourceType: 'ai_agent',
          resourceId: variables.agent_id,
        });
      }
    },
  });
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type UpdateAgentDetailsPayload, updateAgentDetails } from "@/Api/aiAgents";

export function useUpdateAgentDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ agentId, payload }: { agentId: string; payload: UpdateAgentDetailsPayload }) =>
      updateAgentDetails(agentId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ai-agents"] });
      if (variables?.agentId) {
        queryClient.invalidateQueries({ queryKey: ["ai-agent-metrics", variables.agentId] });
      }
    },
  });
}

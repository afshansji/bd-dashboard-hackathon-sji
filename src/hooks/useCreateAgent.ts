import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAgent, type CreateAgentPayload } from "@/Api/aiAgents";

export function useCreateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAgentPayload) => createAgent(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-agents"] });
    },
  });
}

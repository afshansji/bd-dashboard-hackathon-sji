import { useQuery } from "@tanstack/react-query";
import { fetchAgentRunHistory } from "@/Api/aiAgents";

export function useAgentRunHistory(agentId?: string) {
  return useQuery({
    queryKey: ["ai-agent-runs", agentId],
    queryFn: () => {
      if (!agentId) return Promise.resolve([]);
      return fetchAgentRunHistory(agentId);
    },
    enabled: Boolean(agentId),
    staleTime: 30_000,
  });
}

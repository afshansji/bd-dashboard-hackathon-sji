import { useQuery } from "@tanstack/react-query";
import { fetchAgentDashboardMetrics } from "@/Api/aiAgents";

export function useAgentDashboardMetrics(agentId?: string) {
  return useQuery({
    queryKey: ["ai-agent-metrics", agentId],
    queryFn: () => fetchAgentDashboardMetrics(agentId!),
    enabled: Boolean(agentId),
  });
}

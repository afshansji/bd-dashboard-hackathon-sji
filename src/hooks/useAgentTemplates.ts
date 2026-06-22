import { useQuery } from "@tanstack/react-query";
import { listAgentTemplates } from "@/Api/aiAgents";

export function useAgentTemplates() {
  return useQuery({
    queryKey: ["ai-agent-templates"],
    queryFn: listAgentTemplates,
  });
}

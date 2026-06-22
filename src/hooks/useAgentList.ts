import { useQuery } from "@tanstack/react-query";
import { listAgents } from "@/Api/aiAgents";

export function useAgentList() {
  return useQuery({
    queryKey: ["ai-agents"],
    queryFn: listAgents,
  });
}

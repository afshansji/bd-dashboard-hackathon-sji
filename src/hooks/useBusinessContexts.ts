import { useQuery } from "@tanstack/react-query";
import { listBusinessContexts } from "@/Api/aiAgents";

export function useBusinessContexts() {
  return useQuery({
    queryKey: ["ai-business-contexts"],
    queryFn: listBusinessContexts,
  });
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTotalAgentRuns() {
  return useQuery({
    queryKey: ["ai-agent-runs-total"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("ai_agent_runs")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });
}

const RUNS_CAP = 5000;

export function useRunCountByAgent() {
  return useQuery({
    queryKey: ["ai-agent-runs-by-agent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_agent_runs")
        .select("agent_id")
        .not("agent_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(RUNS_CAP);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        const id = row.agent_id;
        if (id) counts[id] = (counts[id] ?? 0) + 1;
      }
      return counts;
    },
  });
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useLatestAIAgentRun(agentId: string) {
  return useQuery({
    queryKey: ['ai-agent-run', agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_agent_runs')
        .select('id, agent_id, title, ai_summary, generated_tasks, created_at, status, category')
        .eq('agent_id', agentId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!agentId
  });
}

export function useAIAgents() {
  return useQuery({
    queryKey: ['ai-agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data;
    }
  });
}

export function useAIConfigurations() {
  return useQuery({
    queryKey: ['ai-configurations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_configurations')
        .select('*')
        .order('configuration_type');

      if (error) throw error;
      return data;
    }
  });
}
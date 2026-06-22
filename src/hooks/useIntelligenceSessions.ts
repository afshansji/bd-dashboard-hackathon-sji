import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface IntelligenceSession {
  id: string;
  client_id: string;
  agent_run_id: string | null;
  question: string;
  mode: "quick" | "deep";
  response_data: any;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  tags: string[];
  tokens_used: number | null;
  cost_estimate: number | null;
  processing_time_ms: number | null;
}

export const useIntelligenceSessions = (clientId: string) => {
  return useQuery({
    queryKey: ["intelligence-sessions", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_intelligence_sessions")
        .select("*")
        .eq("client_id", clientId)
        .eq("is_archived", false)
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      return (data || []) as IntelligenceSession[];
    },
    enabled: !!clientId,
  });
};

export const useSaveIntelligenceSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      clientId: string;
      agentRunId?: string;
      question: string;
      mode: "quick" | "deep";
      responseData: any;
      tokensUsed?: number;
      processingTimeMs?: number;
    }) => {
      const { data, error } = await supabase
        .from("client_intelligence_sessions")
        .insert({
          client_id: params.clientId,
          agent_run_id: params.agentRunId || null,
          question: params.question,
          mode: params.mode,
          response_data: params.responseData,
          tokens_used: params.tokensUsed || null,
          processing_time_ms: params.processingTimeMs || null,
        })
        .select()
        .single();
        
      if (error) throw error;
      return data as IntelligenceSession;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["intelligence-sessions", variables.clientId] });
      toast.success("Session saved");
    },
    onError: (error: any) => {
      console.error("Failed to save session:", error);
      toast.error("Failed to save session");
    },
  });
};

export const useArchiveSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from("client_intelligence_sessions")
        .update({ is_archived: true })
        .eq("id", sessionId);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intelligence-sessions"] });
      toast.success("Session archived");
    },
  });
};

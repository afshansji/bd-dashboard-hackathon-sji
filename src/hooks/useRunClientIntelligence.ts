import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: any;
}

interface RunClientIntelligenceParams {
  clientId: string;
  question: string;
  mode?: "quick" | "deep";
  conversationHistory?: Message[];
}

export function useRunClientIntelligence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, question, mode = "quick", conversationHistory = [] }: RunClientIntelligenceParams) => {
      const startTime = Date.now();
      
      const { data, error } = await supabase.functions.invoke("run-ai-agent", {
        body: {
          target: "client_intelligence",
          client_id: clientId,
          question,
          mode,
          conversation_history: conversationHistory.map(msg => ({
            role: msg.role,
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
          })),
        },
      });

      if (error) throw error;
      
      const processingTime = Date.now() - startTime;
      
      // The response comes back with structured_output containing the tool call result
      const response = data.structured_output || data;
      
      return {
        ...data,
        response,
        processing_time_ms: processingTime,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intelligence-sessions"] });
      toast.success("Intelligence analysis complete");
    },
    onError: (error: any) => {
      console.error("Intelligence analysis failed:", error);
      toast.error(error.message || "Failed to analyze client intelligence");
    },
  });
}

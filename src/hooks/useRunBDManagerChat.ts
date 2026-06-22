import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BDChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  structuredData?: BDManagerChatResponse;
}

export interface RepInsight {
  rep_name: string;
  status: "on_track" | "at_risk" | "off_track" | "excelling";
  highlights: string[];
  metrics?: {
    dhs_rate?: number;
    eod_rate?: number;
    goal_progress?: number;
  };
}

export interface MetricAnalysis {
  metric: string;
  value: number | string;
  trend: "up" | "down" | "stable";
  insight: string;
  change_percent?: number;
}

export interface ActionItem {
  action: string;
  priority: "high" | "medium" | "low";
  owner: string;
  timeline: string;
  context?: string;
}

export interface BDManagerChatResponse {
  summary: string;
  rep_insights?: RepInsight[];
  metrics_analysis?: MetricAnalysis[];
  action_items?: ActionItem[];
  wig_highlights?: string[];
  sources_cited?: {
    type: string;
    name: string;
    relevance: string;
  }[];
  data_quality?: {
    coverage_score: number;
    missing_data: string[];
    data_freshness: string;
  };
}

interface UseRunBDManagerChatOptions {
  weekStartDate?: string;
}

export function useRunBDManagerChat(options: UseRunBDManagerChatOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const askQuestion = async (
    question: string,
    conversationHistory: BDChatMessage[] = [],
    mode: "quick" | "deep" = "quick"
  ): Promise<BDManagerChatResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Format conversation history for the API
      const formattedHistory = conversationHistory.map((msg) => ({
        role: msg.role,
        content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
      }));

      const { data, error: fnError } = await supabase.functions.invoke("run-ai-agent", {
        body: {
          target: "bd_manager_chat",
          question,
          mode,
          conversation_history: formattedHistory,
          execution_context: {
            week_start_date: options.weekStartDate,
            timeframe: options.weekStartDate ? "week" : "current",
          },
        },
      });

      if (fnError) {
        throw new Error(fnError.message || "Failed to get response from BD Manager");
      }

      // Extract the structured response
      const structuredOutput = data?.ai_summary?.structured_output || data?.structured_output || data;

      return {
        summary: structuredOutput?.summary || data?.ai_summary?.summary || "Analysis complete.",
        rep_insights: structuredOutput?.rep_insights || [],
        metrics_analysis: structuredOutput?.metrics_analysis || [],
        action_items: structuredOutput?.action_items || data?.ai_summary?.action_items || [],
        wig_highlights: structuredOutput?.wig_highlights || [],
        sources_cited: structuredOutput?.sources_cited || [],
        data_quality: structuredOutput?.data_quality,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      console.error("BD Manager Chat Error:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    askQuestion,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}

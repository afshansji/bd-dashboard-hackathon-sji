import { useCallback, useEffect, useRef, useState } from "react";
import { streamOpportunityCopilot } from "@/features/upwork-jobs/api/opportunityCopilot";

export interface CopilotChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface UseOpportunityCopilotOptions {
  jobId: string;
  enabled: boolean;
}

interface UseOpportunityCopilotReturn {
  messages: CopilotChatMessage[];
  isStreaming: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  clearError: () => void;
}

function newMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function useOpportunityCopilot({
  jobId,
  enabled,
}: UseOpportunityCopilotOptions): UseOpportunityCopilotReturn {
  const [messages, setMessages] = useState<CopilotChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!enabled) {
      abortRef.current?.abort();
      abortRef.current = null;
      setIsStreaming(false);
      setMessages([]);
      setError(null);
    }
  }, [enabled]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming || !enabled) return;

      setError(null);
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const userMsg: CopilotChatMessage = {
        id: newMessageId(),
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };

      const assistantId = newMessageId();
      const assistantPlaceholder: CopilotChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
      setIsStreaming(true);

      const history = messagesRef.current
        .filter((m) => !m.isStreaming && m.content.length > 0)
        .map((m) => ({ role: m.role, content: m.content }));

      try {
        await streamOpportunityCopilot(
          jobId,
          trimmed,
          history,
          {
            onToken: (token) => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + token }
                    : m,
                ),
              );
            },
            onDone: (fullContent) => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content: fullContent,
                        isStreaming: false,
                        timestamp: new Date(),
                      }
                    : m,
                ),
              );
              setIsStreaming(false);
            },
            onError: (message) => {
              setError(message);
              setMessages((prev) =>
                prev
                  .filter((m) => m.id !== assistantId || m.content.length > 0)
                  .map((m) =>
                    m.id === assistantId ? { ...m, isStreaming: false } : m,
                  ),
              );
              setIsStreaming(false);
            },
          },
          controller.signal,
        );
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : "Failed to send message";
        setError(message);
        setIsStreaming(false);
      }
    },
    [enabled, isStreaming, jobId],
  );

  const clearError = useCallback(() => setError(null), []);

  return { messages, isStreaming, error, sendMessage, clearError };
}

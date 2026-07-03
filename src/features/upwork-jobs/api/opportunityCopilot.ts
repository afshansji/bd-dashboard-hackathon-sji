import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export interface CopilotHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CopilotStreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullContent: string) => void;
  onError: (message: string) => void;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not authenticated. Please log in again.");

  return {
    apikey: ANON_KEY,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function streamOpportunityCopilot(
  jobId: string,
  message: string,
  history: CopilotHistoryMessage[],
  callbacks: CopilotStreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${FUNCTIONS_URL}/opportunity-copilot`, {
    method: "POST",
    headers,
    body: JSON.stringify({ jobId, message, history, stream: true }),
    signal,
  });

  if (!res.ok) {
    let errMsg = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) errMsg = data.error;
    } catch {
      // ignore
    }
    callbacks.onError(errMsg);
    return;
  }

  if (!res.body) {
    callbacks.onError("No response stream received.");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullContent = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const lines = chunk.split("\n");
      let eventType = "message";
      let dataLine = "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          dataLine = line.slice(6);
        }
      }

      if (!dataLine) continue;

      try {
        const parsed = JSON.parse(dataLine) as { content?: string; message?: string };
        if (eventType === "token" && parsed.content) {
          fullContent += parsed.content;
          callbacks.onToken(parsed.content);
        } else if (eventType === "done") {
          callbacks.onDone(parsed.content ?? fullContent);
        } else if (eventType === "error") {
          callbacks.onError(parsed.message ?? "Stream error");
        }
      } catch {
        // skip malformed event
      }
    }
  }

  if (fullContent) {
    callbacks.onDone(fullContent);
  }
}

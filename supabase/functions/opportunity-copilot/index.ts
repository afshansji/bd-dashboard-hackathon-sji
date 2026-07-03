import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { runOrgMemoryQueryFallback } from "../_shared/orgMemoryQueryFallback.ts";
import {
  createAuthedClient,
  createServiceClient,
  newTraceId,
  requireUserId,
} from "../_shared/orgMemory.ts";
import {
  buildChatMessages,
  buildCopilotSystemPrompt,
  buildSupplementaryQuery,
  needsSupplementaryOrgQuery,
  type CopilotMessage,
} from "../_shared/opportunityIntelligence/copilotContext.ts";
import type { UpworkJobRow } from "../_shared/opportunityIntelligence/types.ts";

const ChatSchema = z.object({
  jobId: z.string().uuid(),
  message: z.string().min(1).max(8000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .max(40)
    .optional()
    .default([]),
  stream: z.boolean().optional().default(true),
});

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function fetchJob(
  serviceClient: ReturnType<typeof createServiceClient>,
  jobId: string,
): Promise<UpworkJobRow | null> {
  const { data, error } = await serviceClient
    .from("upwork_jobs")
    .select(
      "id, title, description, job_type, hourly_rate, fixed_budget, experience_level, project_length, weekly_hours, skills, client_country",
    )
    .eq("id", jobId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    skills: Array.isArray(data.skills) ? data.skills.map(String) : [],
  } as UpworkJobRow;
}

async function fetchCachedAnalysis(
  serviceClient: ReturnType<typeof createServiceClient>,
  jobId: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await serviceClient
    .from("opportunity_analysis")
    .select("analysis_json")
    .eq("job_id", jobId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.analysis_json) return null;
  return data.analysis_json as Record<string, unknown>;
}

async function runSupplementaryOrgQuery(
  serviceClient: ReturnType<typeof createServiceClient>,
  query: string,
): Promise<string> {
  const traceId = newTraceId();
  const result = await runOrgMemoryQueryFallback(serviceClient, traceId, {
    query,
    capabilities: ["knowledge_retrieval", "project_understanding"],
    options: { maxRepos: 20, maxChunks: 10, searchAllRepos: true },
  }) as Record<string, unknown>;

  const answer = typeof result.answer === "string" ? result.answer : "";
  const citations = Array.isArray(result.citations) ? result.citations : [];
  const projects = Array.isArray(result.projects) ? result.projects : [];

  const parts: string[] = [];
  if (answer) parts.push(answer);
  if (projects.length > 0) {
    parts.push(
      "\nProjects:\n" +
        projects
          .slice(0, 10)
          .map((p) => {
            const row = p as Record<string, unknown>;
            const stack = Array.isArray(row.techStack)
              ? (row.techStack as string[]).join(", ")
              : "";
            return `- ${row.name}${stack ? ` (${stack})` : ""}`;
          })
          .join("\n"),
    );
  }
  if (citations.length > 0) {
    parts.push(
      "\nCitations:\n" +
        citations
          .slice(0, 8)
          .map((c) => {
            const row = c as Record<string, unknown>;
            const excerpt = String(row.excerpt ?? "").slice(0, 200);
            return `- ${row.sourcePath}: ${excerpt}`;
          })
          .join("\n"),
    );
  }

  return parts.join("\n") || "No additional indexed evidence found.";
}

function getAiConfig(): { apiKey: string; url: string; model: string; provider: string } | null {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey) {
    return {
      apiKey: lovableKey,
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      model: "google/gemini-2.5-flash",
      provider: "lovable",
    };
  }
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (openaiKey) {
    return {
      apiKey: openaiKey,
      url: "https://api.openai.com/v1/chat/completions",
      model: "gpt-4o-mini",
      provider: "openai",
    };
  }
  return null;
}

function createSseStream(
  aiResponse: Response,
  onComplete: (fullText: string) => void,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let fullText = "";

  return new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        if (!aiResponse.ok || !aiResponse.body) {
          const errText = await aiResponse.text();
          send("error", { message: errText || "AI request failed" });
          controller.close();
          return;
        }

        const reader = aiResponse.body.getReader();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") continue;

            try {
              const parsed = JSON.parse(payload) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const token = parsed.choices?.[0]?.delta?.content;
              if (token) {
                fullText += token;
                send("token", { content: token });
              }
            } catch {
              // skip malformed chunks
            }
          }
        }

        send("done", { content: fullText });
        onComplete(fullText);
      } catch (error) {
        send("error", { message: errorMessage(error) });
      } finally {
        controller.close();
      }
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const authedClient = createAuthedClient(req);
    const userId = await requireUserId(authedClient);
    if (!userId) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = ChatSchema.parse(await req.json());
    const serviceClient = createServiceClient();

    const [job, analysis] = await Promise.all([
      fetchJob(serviceClient, body.jobId),
      fetchCachedAnalysis(serviceClient, body.jobId),
    ]);

    if (!job) {
      return jsonResponse({ error: "Upwork job not found" }, 404);
    }
    if (!analysis) {
      return jsonResponse(
        { error: "No opportunity analysis found. Run analysis first." },
        400,
      );
    }

    let supplementaryEvidence: string | undefined;
    if (needsSupplementaryOrgQuery(body.message, analysis)) {
      const query = buildSupplementaryQuery(body.message);
      supplementaryEvidence = await runSupplementaryOrgQuery(serviceClient, query);
    }

    const systemPrompt = buildCopilotSystemPrompt(job, analysis, supplementaryEvidence);
    const chatMessages = buildChatMessages(
      systemPrompt,
      body.history as CopilotMessage[],
      body.message,
    );

    const aiConfig = getAiConfig();
    if (!aiConfig) {
      return jsonResponse(
        { error: "No AI API key configured. Set LOVABLE_API_KEY or OPENAI_API_KEY." },
        500,
      );
    }

    const aiResponse = await fetch(aiConfig.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiConfig.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: chatMessages,
        temperature: 0.5,
        stream: body.stream,
      }),
    });

    if (!body.stream) {
      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        return jsonResponse({ error: errText || "AI request failed" }, 500);
      }
      const data = await aiResponse.json();
      const content =
        data.choices?.[0]?.message?.content ?? "No response generated.";
      return jsonResponse({
        content,
        supplementaryQuery: Boolean(supplementaryEvidence),
        model: aiConfig.model,
        provider: aiConfig.provider,
      });
    }

    const stream = createSseStream(aiResponse, () => {
      // completion hook — no persistence required for v1
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("opportunity-copilot error:", error);
    return jsonResponse(
      { error: errorMessage(error) },
      error instanceof z.ZodError ? 400 : 500,
    );
  }
});

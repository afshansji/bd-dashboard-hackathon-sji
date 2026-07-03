import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  createAuthedClient,
  createServiceClient,
  newTraceId,
  requireUserId,
} from "../_shared/orgMemory.ts";
import { runOrgMemoryQueryFallback } from "../_shared/orgMemoryQueryFallback.ts";
import {
  buildOutreachMessages,
  buildOutreachQuery,
  extractOutreachEvidenceFromAnalysis,
  mergeOutreachEvidence,
  type JobLeadOutreachContext,
  type OutreachEvidence,
  type OutreachType,
} from "../_shared/jobLeadOutreach.ts";

const RequestSchema = z.object({
  jobId: z.string().uuid(),
  type: z.enum(["reply", "email"]),
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

function getAiConfig(): { apiKey: string; url: string; model: string } | null {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey) {
    return {
      apiKey: lovableKey,
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      model: "google/gemini-2.5-flash",
    };
  }

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (openaiKey) {
    return {
      apiKey: openaiKey,
      url: "https://api.openai.com/v1/chat/completions",
      model: "gpt-4o-mini",
    };
  }

  return null;
}

async function fetchJob(
  serviceClient: ReturnType<typeof createServiceClient>,
  jobId: string,
): Promise<JobLeadOutreachContext | null> {
  const { data, error } = await serviceClient
    .from("upwork_jobs")
    .select(
      "title, description, source, lead_type, job_url, job_type, skills, client_country",
    )
    .eq("id", jobId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    source: data.source ? String(data.source) : null,
    lead_type: data.lead_type ? String(data.lead_type) : null,
    job_url: data.job_url ? String(data.job_url) : null,
    job_type: data.job_type ? String(data.job_type) : null,
    skills: Array.isArray(data.skills) ? data.skills.map(String) : [],
    client_country: data.client_country ? String(data.client_country) : null,
  };
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

async function fetchOutreachEvidence(
  serviceClient: ReturnType<typeof createServiceClient>,
  job: JobLeadOutreachContext,
  analysis: Record<string, unknown> | null,
): Promise<OutreachEvidence> {
  const analysisEvidence = extractOutreachEvidenceFromAnalysis(analysis);

  try {
    const orgMemory = await runOrgMemoryQueryFallback(
      serviceClient,
      newTraceId(),
      {
        query: buildOutreachQuery(job),
        capabilities: ["knowledge_retrieval", "project_understanding"],
        options: { maxRepos: 12, maxChunks: 8, searchAllRepos: true },
      },
    ) as Record<string, unknown>;

    return mergeOutreachEvidence(analysisEvidence, {
      answer: typeof orgMemory.answer === "string" ? orgMemory.answer : undefined,
      projects: Array.isArray(orgMemory.projects)
        ? orgMemory.projects as Array<Record<string, unknown>>
        : [],
      citations: Array.isArray(orgMemory.citations)
        ? orgMemory.citations as Array<{ sourcePath?: string; excerpt?: string }>
        : [],
    });
  } catch (error) {
    console.warn("job-lead-outreach org memory lookup failed:", error);
    return analysisEvidence;
  }
}

async function generateOutreach(
  type: OutreachType,
  job: JobLeadOutreachContext,
  evidence: OutreachEvidence,
): Promise<string> {
  const ai = getAiConfig();
  if (!ai) {
    throw new Error("AI is not configured. Set LOVABLE_API_KEY or OPENAI_API_KEY.");
  }

  const messages = buildOutreachMessages(type, job, evidence);
  const response = await fetch(ai.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ai.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ai.model,
      messages,
      temperature: 0.55,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "AI request failed");
  }

  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("AI returned an empty response");
  }

  return content;
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

    const body = RequestSchema.parse(await req.json());
    const serviceClient = createServiceClient();
    const job = await fetchJob(serviceClient, body.jobId);

    if (!job) {
      return jsonResponse({ error: "Lead not found" }, 404);
    }

    const analysis = await fetchCachedAnalysis(serviceClient, body.jobId);
    const evidence = await fetchOutreachEvidence(serviceClient, job, analysis);
    const content = await generateOutreach(body.type, job, evidence);

    return jsonResponse({
      type: body.type,
      content,
      evidenceUsed: {
        projectCount: evidence.projects.length,
        hasOrgMemory: Boolean(evidence.orgMemorySummary),
        capabilityProofCount: evidence.capabilityProof.length,
      },
    });
  } catch (error) {
    console.error("job-lead-outreach error:", error);
    const message = errorMessage(error);
    const status = message.includes("not found") ? 404 : 500;
    return jsonResponse({ error: message }, status);
  }
});

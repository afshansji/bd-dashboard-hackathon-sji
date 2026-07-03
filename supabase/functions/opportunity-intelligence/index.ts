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
  applyExplanationToAnalysis,
  generateExplanation,
} from "../_shared/opportunityIntelligence/explanation.ts";
import {
  buildOrgMemoryQuery,
  extractJobSignals,
} from "../_shared/opportunityIntelligence/jobExtraction.ts";
import { mapOrgMemoryResult, fetchIndexedOrgCorpus } from "../_shared/opportunityIntelligence/orgMemoryBridge.ts";
import { buildIntelligenceReport } from "../_shared/opportunityIntelligence/reportBuilder.ts";
import { EVIDENCE_CORPUS_REPO_LIMIT } from "../_shared/opportunityIntelligence/capabilityOntology.ts";

/** Keep edge analysis under Supabase wall-clock limits (large orgs can have 500+ repos). */
const EDGE_CORPUS_REPO_LIMIT = Math.min(EVIDENCE_CORPUS_REPO_LIMIT, 120);
import {
  buildAnalysisResult,
  buildTemplateSummary,
  computeOpportunityScores,
} from "../_shared/opportunityIntelligence/scoring.ts";
import type { UpworkJobRow } from "../_shared/opportunityIntelligence/types.ts";

const AnalyzeSchema = z.object({
  jobId: z.string().uuid(),
  force: z.boolean().optional(),
});

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const record = error as Record<string, unknown>;
    const parts = [record.message, record.details, record.hint, record.code]
      .filter((part) => typeof part === "string" && part.length > 0);
    if (parts.length > 0) return parts.join(" — ");
  }
  return String(error);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function fetchCachedAnalysis(
  serviceClient: ReturnType<typeof createServiceClient>,
  jobId: string,
) {
  const { data, error } = await serviceClient
    .from("opportunity_analysis")
    .select("*")
    .eq("job_id", jobId)
    .maybeSingle();

  if (error) throw error;
  return data;
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

async function runAnalysis(
  serviceClient: ReturnType<typeof createServiceClient>,
  job: UpworkJobRow,
) {
  const startedAt = Date.now();
  const signals = extractJobSignals(job);
  const orgQuery = buildOrgMemoryQuery(job, signals);
  const traceId = newTraceId();

  const orgMemoryResult = await runOrgMemoryQueryFallback(serviceClient, traceId, {
    query: orgQuery,
    capabilities: [
      "repository_discovery",
      "project_understanding",
      "knowledge_retrieval",
    ],
    filters: {
      techStack: signals.technologies,
      industry: signals.domain ?? undefined,
    },
    options: {
      maxRepos: 30,
      maxChunks: 10,
      searchAllRepos: true,
      skipLlmSynthesis: true,
    },
  }) as Record<string, unknown>;

  console.log("opportunity-intelligence: org memory", Date.now() - startedAt, "ms");

  const { projects, repos, citations } = mapOrgMemoryResult(orgMemoryResult);

  let corpus = {
    projects,
    repos,
    totalIndexedRepos: repos.length,
  };
  try {
    corpus = await fetchIndexedOrgCorpus(
      serviceClient,
      EDGE_CORPUS_REPO_LIMIT,
    );
  } catch (corpusError) {
    console.error(
      "fetchIndexedOrgCorpus failed, using job-relevant repos:",
      corpusError,
    );
  }

  const scored = computeOpportunityScores({
    jobTitle: job.title,
    jobDescription: job.description ?? "",
    signals,
    projects,
    repos,
    citations,
  });

  const templateSummary = buildTemplateSummary(
    scored.recommendation,
    scored.breakdown,
  );

  let analysis = buildAnalysisResult({
    jobTitle: job.title,
    jobDescription: job.description ?? "",
    signals,
    projects,
    repos,
    citations,
    summary: templateSummary,
  });

  if (Date.now() - startedAt < 45_000) {
    const explanation = await generateExplanation({
      jobTitle: job.title,
      signals,
      breakdown: scored.breakdown,
      recommendation: scored.recommendation,
      confidence: scored.confidence,
      projects,
      repos,
      citations,
      evidenceNote: scored.evidenceNote,
    });
    analysis = applyExplanationToAnalysis(analysis, scored.breakdown, explanation);
  } else {
    console.warn(
      "opportunity-intelligence: skipping LLM explanation — approaching time budget",
    );
  }

  analysis = {
    ...analysis,
    report: buildIntelligenceReport({
      job,
      signals,
      recommendation: analysis.recommendation,
      confidence: analysis.confidence,
      summary: analysis.summary,
      breakdown: scored.breakdown,
      projects,
      repos,
      citations,
      evidenceProjects: corpus.projects,
      evidenceRepos: corpus.repos,
      evidenceScope: {
        totalIndexedRepos: corpus.totalIndexedRepos,
        jobRelevantRepos: repos.length,
        reposScannedForEvidence: corpus.repos.length,
      },
    }),
  };

  console.log("opportunity-intelligence: total analysis", Date.now() - startedAt, "ms");

  return {
    analysis,
    scoreBreakdown: scored.breakdown,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authedClient = createAuthedClient(req);
    const userId = await requireUserId(authedClient);
    if (!userId) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const serviceClient = createServiceClient();

    if (req.method === "GET") {
      const url = new URL(req.url);
      const jobId = url.searchParams.get("jobId");
      if (!jobId) {
        return jsonResponse({ error: "jobId query parameter is required" }, 400);
      }

      const cached = await fetchCachedAnalysis(serviceClient, jobId);
      if (!cached) {
        return jsonResponse({ analysis: null });
      }

      return jsonResponse({
        analysis: cached.analysis_json,
        cached: true,
        id: cached.id,
        recommendation: cached.recommendation,
        confidence: cached.confidence,
        scoreBreakdown: cached.score_breakdown,
        analyzedAt: cached.updated_at,
      });
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const body = AnalyzeSchema.parse(await req.json());
    const job = await fetchJob(serviceClient, body.jobId);
    if (!job) {
      return jsonResponse({ error: "Upwork job not found" }, 404);
    }

    if (!body.force) {
      const cached = await fetchCachedAnalysis(serviceClient, body.jobId);
      if (cached) {
        return jsonResponse({
          analysis: cached.analysis_json,
          cached: true,
          id: cached.id,
          recommendation: cached.recommendation,
          confidence: cached.confidence,
          scoreBreakdown: cached.score_breakdown,
          analyzedAt: cached.updated_at,
        });
      }
    }

    const { analysis, scoreBreakdown } = await runAnalysis(serviceClient, job);

    const { data: saved, error: saveError } = await serviceClient
      .from("opportunity_analysis")
      .upsert(
        {
          job_id: body.jobId,
          recommendation: analysis.recommendation,
          confidence: analysis.confidence,
          analysis_json: analysis,
          score_breakdown: scoreBreakdown,
          created_by: userId,
        },
        { onConflict: "job_id" },
      )
      .select("*")
      .single();

    if (saveError) throw saveError;

    return jsonResponse({
      analysis,
      cached: false,
      id: saved.id,
      recommendation: analysis.recommendation,
      confidence: analysis.confidence,
      scoreBreakdown,
      analyzedAt: saved.updated_at,
    });
  } catch (error) {
    console.error("opportunity-intelligence error:", error);
    return jsonResponse(
      { error: errorMessage(error) },
      error instanceof z.ZodError ? 400 : 500,
    );
  }
});

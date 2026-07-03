import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { buildCompanyIntelligenceReport } from "../_shared/companyIntelligence/reportBuilder.ts";
import type { CompanyIntelligenceReport } from "../_shared/companyIntelligence/types.ts";
import {
  createAuthedClient,
  createServiceClient,
  newTraceId,
  requireUserId,
} from "../_shared/orgMemory.ts";
import { runOrgMemoryQueryFallback } from "../_shared/orgMemoryQueryFallback.ts";
import { getValidUrl } from "../_shared/urlUtils.ts";

const ResearchSchema = z.object({
  jobId: z.string().uuid(),
  companyWebsite: z.string().min(4),
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

async function fetchCachedReport(
  serviceClient: ReturnType<typeof createServiceClient>,
  jobId: string,
) {
  const { data, error } = await serviceClient
    .from("company_intelligence_reports")
    .select("*")
    .eq("job_id", jobId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function fetchJob(
  serviceClient: ReturnType<typeof createServiceClient>,
  jobId: string,
) {
  const { data, error } = await serviceClient
    .from("upwork_jobs")
    .select("id, title, description")
    .eq("id", jobId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function buildOrgMemoryQuery(website: string, jobTitle?: string, jobDescription?: string): string {
  const parts = [
    `Company website: ${website}`,
    jobTitle ? `Opportunity: ${jobTitle}` : "",
    jobDescription ? jobDescription.slice(0, 400) : "",
    "Find internal projects with similar technology stack, industry, or business problems for portfolio matching.",
  ].filter(Boolean);

  return parts.join("\n");
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

      const cached = await fetchCachedReport(serviceClient, jobId);
      if (!cached) {
        return jsonResponse({ report: null });
      }

      return jsonResponse({
        report: cached.report_json as CompanyIntelligenceReport,
        companyWebsite: cached.company_website,
        cached: true,
        id: cached.id,
        researchedAt: cached.updated_at,
      });
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const body = ResearchSchema.parse(await req.json());
    const normalizedWebsite = getValidUrl(body.companyWebsite);
    if (!normalizedWebsite) {
      return jsonResponse({ error: "Invalid company website URL" }, 400);
    }

    const job = await fetchJob(serviceClient, body.jobId);
    if (!job) {
      return jsonResponse({ error: "Job lead not found" }, 404);
    }

    if (!body.force) {
      const cached = await fetchCachedReport(serviceClient, body.jobId);
      if (cached && cached.company_website === normalizedWebsite) {
        return jsonResponse({
          report: cached.report_json as CompanyIntelligenceReport,
          companyWebsite: cached.company_website,
          cached: true,
          id: cached.id,
          researchedAt: cached.updated_at,
        });
      }
    }

    const traceId = newTraceId();
    const orgQuery = buildOrgMemoryQuery(
      normalizedWebsite,
      job.title,
      job.description ?? undefined,
    );

    let orgMemoryResult: Record<string, unknown> = {};
    try {
      orgMemoryResult = await runOrgMemoryQueryFallback(serviceClient, traceId, {
        query: orgQuery,
        capabilities: [
          "repository_discovery",
          "project_understanding",
          "knowledge_retrieval",
        ],
        options: {
          maxRepos: 20,
          maxChunks: 8,
          searchAllRepos: true,
          skipLlmSynthesis: true,
        },
      }) as Record<string, unknown>;
    } catch (orgError) {
      console.error("company-intelligence: org memory query failed", orgError);
    }

    const report = await buildCompanyIntelligenceReport({
      website: normalizedWebsite,
      jobTitle: job.title,
      jobDescription: job.description ?? undefined,
      orgMemoryResult,
    });

    const { data: saved, error: saveError } = await serviceClient
      .from("company_intelligence_reports")
      .upsert(
        {
          job_id: body.jobId,
          company_website: normalizedWebsite,
          report_json: report,
          created_by: userId,
        },
        { onConflict: "job_id" },
      )
      .select("*")
      .single();

    if (saveError) throw saveError;

    return jsonResponse({
      report,
      companyWebsite: normalizedWebsite,
      cached: false,
      id: saved.id,
      researchedAt: saved.updated_at,
    });
  } catch (error) {
    console.error("company-intelligence error:", error);
    return jsonResponse(
      { error: errorMessage(error) },
      error instanceof z.ZodError ? 400 : 500,
    );
  }
});

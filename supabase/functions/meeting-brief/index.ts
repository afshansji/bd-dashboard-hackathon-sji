import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { buildMeetingBrief } from "../_shared/meetingBrief/briefBuilder.ts";
import type { MeetingBrief } from "../_shared/meetingBrief/types.ts";
import {
  createAuthedClient,
  createServiceClient,
  newTraceId,
  requireUserId,
} from "../_shared/orgMemory.ts";
import { runOrgMemoryQueryFallback } from "../_shared/orgMemoryQueryFallback.ts";

const WorkspaceSchema = z.object({
  notes: z.string().optional().default(""),
  proposalDraft: z.string().optional().default(""),
  assignedToName: z.string().nullable().optional().default(null),
  status: z.string().optional().default("new"),
  tasks: z.array(z.object({
    title: z.string(),
    completed: z.boolean(),
  })).optional().default([]),
  recentActivities: z.array(z.object({
    action: z.string(),
    detail: z.string().optional(),
  })).optional().default([]),
});

const GenerateSchema = z.object({
  jobId: z.string().uuid(),
  force: z.boolean().optional(),
  workspace: WorkspaceSchema.optional(),
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

async function fetchCachedBrief(
  serviceClient: ReturnType<typeof createServiceClient>,
  jobId: string,
) {
  const { data, error } = await serviceClient
    .from("meeting_briefs")
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
    .select(
      "id, title, description, source, job_url, skills, job_type, experience_level, client_country, fixed_budget, hourly_rate",
    )
    .eq("id", jobId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function fetchOpportunityAnalysis(
  serviceClient: ReturnType<typeof createServiceClient>,
  jobId: string,
) {
  const { data, error } = await serviceClient
    .from("opportunity_analysis")
    .select("analysis_json, recommendation, confidence")
    .eq("job_id", jobId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function fetchCompanyIntelligence(
  serviceClient: ReturnType<typeof createServiceClient>,
  jobId: string,
) {
  const { data, error } = await serviceClient
    .from("company_intelligence_reports")
    .select("report_json, company_website")
    .eq("job_id", jobId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function buildOrgQuery(job: Record<string, unknown>): string {
  const skills = Array.isArray(job.skills) ? job.skills.map(String).join(", ") : "";
  return [
    `Opportunity: ${job.title}`,
    job.description ? String(job.description).slice(0, 500) : "",
    skills ? `Technologies: ${skills}` : "",
    "Find similar internal projects, portfolio evidence, and relevant case studies for a discovery call.",
  ].filter(Boolean).join("\n");
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

      const cached = await fetchCachedBrief(serviceClient, jobId);
      if (!cached) {
        return jsonResponse({ brief: null });
      }

      return jsonResponse({
        brief: cached.brief_json as MeetingBrief,
        cached: true,
        id: cached.id,
        generatedAt: cached.updated_at,
      });
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const body = GenerateSchema.parse(await req.json());
    const workspace = body.workspace ?? WorkspaceSchema.parse({});

    const job = await fetchJob(serviceClient, body.jobId);
    if (!job) {
      return jsonResponse({ error: "Job lead not found" }, 404);
    }

    if (!body.force) {
      const cached = await fetchCachedBrief(serviceClient, body.jobId);
      if (cached) {
        return jsonResponse({
          brief: cached.brief_json as MeetingBrief,
          cached: true,
          id: cached.id,
          generatedAt: cached.updated_at,
        });
      }
    }

    const [opportunityRow, companyRow] = await Promise.all([
      fetchOpportunityAnalysis(serviceClient, body.jobId),
      fetchCompanyIntelligence(serviceClient, body.jobId),
    ]);

    const traceId = newTraceId();
    let orgMemoryResult: Record<string, unknown> = {};
    try {
      orgMemoryResult = await runOrgMemoryQueryFallback(serviceClient, traceId, {
        query: buildOrgQuery(job as Record<string, unknown>),
        capabilities: [
          "repository_discovery",
          "project_understanding",
          "knowledge_retrieval",
        ],
        options: {
          maxRepos: 25,
          maxChunks: 10,
          searchAllRepos: true,
          skipLlmSynthesis: true,
        },
      }) as Record<string, unknown>;
    } catch (orgError) {
      console.error("meeting-brief: org memory query failed", orgError);
    }

    const sourceSnapshot = {
      hasOpportunityAnalysis: Boolean(opportunityRow),
      hasCompanyIntelligence: Boolean(companyRow),
      hasWorkspaceNotes: Boolean(workspace.notes?.trim()),
      hasProposalDraft: Boolean(workspace.proposalDraft?.trim()),
      assignedToName: workspace.assignedToName,
    };

    const brief = await buildMeetingBrief({
      job: {
        title: job.title ?? "",
        description: job.description ?? "",
        source: job.source ?? "unknown",
        jobUrl: job.job_url,
        skills: Array.isArray(job.skills) ? job.skills.map(String) : [],
        jobType: job.job_type,
        experienceLevel: job.experience_level,
        clientCountry: job.client_country,
        fixedBudget: job.fixed_budget,
        hourlyRate: job.hourly_rate,
      },
      opportunityAnalysis: opportunityRow?.analysis_json as Record<string, unknown> ?? null,
      companyIntelligence: companyRow?.report_json as Record<string, unknown> ?? null,
      workspace: {
        notes: workspace.notes ?? "",
        proposalDraft: workspace.proposalDraft ?? "",
        assignedToName: workspace.assignedToName ?? null,
        status: workspace.status ?? "new",
        tasks: workspace.tasks ?? [],
        recentActivities: workspace.recentActivities ?? [],
      },
      orgMemoryResult,
    });

    const { data: saved, error: saveError } = await serviceClient
      .from("meeting_briefs")
      .upsert(
        {
          job_id: body.jobId,
          brief_json: brief,
          source_snapshot: sourceSnapshot,
          created_by: userId,
        },
        { onConflict: "job_id" },
      )
      .select("*")
      .single();

    if (saveError) throw saveError;

    return jsonResponse({
      brief,
      cached: false,
      id: saved.id,
      generatedAt: saved.updated_at,
    });
  } catch (error) {
    console.error("meeting-brief error:", error);
    return jsonResponse(
      { error: errorMessage(error) },
      error instanceof z.ZodError ? 400 : 500,
    );
  }
});

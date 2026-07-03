import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { normalizeJobLeadSourceForStorage } from "../_shared/jobLeadSources.ts";

const VALID_LEAD_TYPES = new Set(["hiring", "post", "job"]);

interface JobLeadPayload {
  source?: string | null;
  id?: string | null;
  title?: string | null;
  description?: string | null;
  leadType?: string | null;
  jobType?: string | null;
  hourlyRate?: string | null;
  fixedBudget?: string | null;
  experienceLevel?: string | null;
  projectLength?: string | null;
  weeklyHours?: string | null;
  proposalCount?: string | null;
  postedTime?: string | null;
  paymentVerified?: boolean | null;
  clientRating?: string | null;
  clientSpent?: string | null;
  clientCountry?: string | null;
  clientHireRate?: string | null;
  clientTotalJobs?: string | null;
  clientCompanySize?: string | null;
  skills?: string[] | null;
  attachments?: unknown[] | null;
  screeningQuestions?: string[] | null;
  jobUrl?: string | null;
  scrapedAt?: string | null;
}

interface IngestSummary {
  success: boolean;
  received: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: Array<{ jobUrl: string | null; error: string }>;
}

const encoder = new TextEncoder();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token && token.length > 0 ? token : null;
}

function validateApiKey(req: Request): void {
  const configuredKey = Deno.env.get("UPWORK_INSPECTOR_API_KEY");
  if (!configuredKey) {
    throw new Error("UPWORK_INSPECTOR_API_KEY is not configured");
  }

  const customHeader = req.headers.get("x-upwork-inspector-key")?.trim();
  const bearerToken = getBearerToken(req.headers.get("authorization"));
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")?.trim();

  // Extension sends Supabase anon key as Authorization when deployed as Edge Function.
  const token =
    customHeader ||
    (bearerToken && bearerToken !== anonKey ? bearerToken : null);

  if (!token || token !== configuredKey) {
    throw new Error("Invalid API key");
  }
}

function normalizeSource(
  value: string | null | undefined,
  jobUrl?: string | null,
): string {
  return normalizeJobLeadSourceForStorage(value, jobUrl);
}

function normalizeLeadType(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || !VALID_LEAD_TYPES.has(normalized)) {
    return null;
  }
  return normalized;
}

function routeSegments(url: URL, functionName: string): string[] {
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.lastIndexOf(functionName);
  return idx >= 0 ? parts.slice(idx + 1) : parts;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  const bytes = new Uint8Array(digest);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function computeContentHash(job: JobLeadPayload): Promise<string> {
  const payload = [
    job.title?.trim() ?? "",
    job.description?.trim() ?? "",
    job.clientCountry?.trim() ?? "",
  ].join("|");
  return sha256Hex(payload);
}

async function computeDedupeKey(job: JobLeadPayload): Promise<string> {
  const source = normalizeSource(job.source, job.jobUrl);
  const jobUrl = job.jobUrl?.trim();
  if (jobUrl) return `${source}:url:${jobUrl}`;

  const platformId = job.id?.trim();
  if (platformId) return `${source}:id:${platformId}`;

  return `${source}:hash:${await computeContentHash(job)}`;
}

function parseScrapedAt(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function isValidJob(job: JobLeadPayload): boolean {
  const title = job.title?.trim();
  const jobUrl = job.jobUrl?.trim();
  return Boolean(title || jobUrl);
}

function mapJobToRow(job: JobLeadPayload, dedupeKey: string, contentHash: string) {
  const source = normalizeSource(job.source, job.jobUrl);
  return {
    upwork_job_id: job.id?.trim() || null,
    title: job.title?.trim() || "",
    description: job.description?.trim() || "",
    lead_type: normalizeLeadType(job.leadType),
    job_type: job.jobType?.trim() || null,
    hourly_rate: job.hourlyRate?.trim() || null,
    fixed_budget: job.fixedBudget?.trim() || null,
    experience_level: job.experienceLevel?.trim() || null,
    project_length: job.projectLength?.trim() || null,
    weekly_hours: job.weeklyHours?.trim() || null,
    proposal_count: job.proposalCount?.trim() || null,
    posted_time: job.postedTime?.trim() || null,
    payment_verified: job.paymentVerified ?? null,
    client_rating: job.clientRating?.trim() || null,
    client_spent: job.clientSpent?.trim() || null,
    client_country: job.clientCountry?.trim() || null,
    client_hire_rate: job.clientHireRate?.trim() || null,
    client_total_jobs: job.clientTotalJobs?.trim() || null,
    client_company_size: job.clientCompanySize?.trim() || null,
    skills: job.skills ?? [],
    attachments: job.attachments ?? [],
    screening_questions: job.screeningQuestions ?? [],
    job_url: job.jobUrl?.trim() || null,
    scraped_at: parseScrapedAt(job.scrapedAt),
    content_hash: contentHash,
    dedupe_key: dedupeKey,
    source,
  };
}

async function ingestJobs(jobs: JobLeadPayload[]): Promise<IngestSummary> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const summary: IngestSummary = {
    success: true,
    received: jobs.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (const job of jobs) {
    try {
      if (!isValidJob(job)) {
        summary.skipped += 1;
        summary.errors.push({
          jobUrl: job.jobUrl ?? null,
          error: "Job must include title or jobUrl",
        });
        continue;
      }

      const dedupeKey = await computeDedupeKey(job);
      const contentHash = await computeContentHash(job);
      const row = mapJobToRow(job, dedupeKey, contentHash);

      const { data: existing, error: lookupError } = await supabase
        .from("upwork_jobs")
        .select("id")
        .eq("dedupe_key", dedupeKey)
        .maybeSingle();

      if (lookupError) {
        throw new Error(lookupError.message);
      }

      const { error: upsertError } = await supabase
        .from("upwork_jobs")
        .upsert(row, { onConflict: "dedupe_key" });

      if (upsertError) {
        throw new Error(upsertError.message);
      }

      if (existing) {
        summary.updated += 1;
      } else {
        summary.inserted += 1;
      }
    } catch (error) {
      summary.skipped += 1;
      summary.errors.push({
        jobUrl: job.jobUrl ?? null,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return summary;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const route = routeSegments(url, "upwork-inspector");

    if (req.method === "GET" && (route.length === 0 || route[0] === "health")) {
      validateApiKey(req);
      return jsonResponse({ status: "ok" });
    }

    if (
      req.method === "POST" &&
      route.length >= 3 &&
      route[0] === "api" &&
      route[1] === "upwork" &&
      route[2] === "jobs"
    ) {
      validateApiKey(req);

      const body = await req.json();
      const jobs = body?.jobs;

      if (!Array.isArray(jobs)) {
        return jsonResponse({ error: "jobs array required" }, 400);
      }

      const summary = await ingestJobs(jobs as JobLeadPayload[]);
      return jsonResponse(summary);
    }

    return jsonResponse({ error: "Not Found" }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "Invalid API key" || message === "Missing API key") {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    if (message.includes("UPWORK_INSPECTOR_API_KEY is not configured")) {
      console.error("[upwork-inspector]", message);
      return jsonResponse({ error: "Server configuration error" }, 500);
    }

    console.error("[upwork-inspector] Error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});

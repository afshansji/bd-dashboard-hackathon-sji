import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

import { corsHeaders } from "../_shared/cors.ts";

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

type LeadRow = Record<string, unknown> & {
  id: string;
  enrichment_status?: string | null;
  lead_score_exa?: number | null;
  metadata?: Record<string, unknown> | null;
  enrichment_metadata?: Record<string, unknown> | null;
};

type ExaEnrichmentResult = {
  score: number | null;
  metadata: Record<string, unknown>;
  raw: unknown;
};

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "PUT") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let serviceClient: SupabaseClient | null = null;
  let leadId: string | null = null;

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) {
      throw new HttpError(401, "Missing authorization header");
    }

    const { userClient, serviceRoleClient } = createSupabaseClients(authorization);
    serviceClient = serviceRoleClient;

    const userId = await requireAuthenticatedUser(userClient);
    await assertAdminPrivileges(serviceRoleClient, userId);

    const url = new URL(req.url);
    leadId = extractLeadId(url);
    if (!leadId) {
      throw new HttpError(400, "Lead ID must be provided in the request path");
    }

    const lead = await fetchLead(serviceRoleClient, leadId);
    const enrichment = await enrichLeadWithExa(lead);
    const updatedLead = await persistEnrichment(serviceRoleClient, lead, enrichment);

    return new Response(JSON.stringify({ lead: updatedLead }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Internal server error";

    if (serviceClient && leadId && status >= 500) {
      try {
        await markEnrichmentFailed(serviceClient, leadId, message);
      } catch (updateError) {
        console.error("[admin-leads-exa-enrich] Failed to update lead status after error", updateError);
      }
    }

    console.error("[admin-leads-exa-enrich]", error);

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function createSupabaseClients(authorizationHeader: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceKey) {
    throw new HttpError(500, "Supabase credentials are not configured");
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authorizationHeader,
      },
    },
  });

  const serviceClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  return { userClient, serviceRoleClient: serviceClient };
}

async function requireAuthenticatedUser(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    throw new HttpError(401, "Invalid authentication");
  }
  return data.user.id;
}

async function assertAdminPrivileges(client: SupabaseClient, userId: string): Promise<void> {
  const { data, error } = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[admin-leads-exa-enrich] Unable to verify user role", error);
    throw new HttpError(500, "Unable to verify permissions");
  }

  const role = (data as { role?: string } | null)?.role ?? null;
  if (!role || !["super_admin", "manager"].includes(role)) {
    throw new HttpError(403, "Insufficient privileges");
  }
}

function extractLeadId(url: URL): string | null {
  const segments = url.pathname.split("/").filter(Boolean);
  const functionIndex = segments.indexOf("admin-leads-exa-enrich");
  if (functionIndex === -1) {
    return null;
  }
  const id = segments[functionIndex + 1];
  return id ?? null;
}

async function fetchLead(client: SupabaseClient, leadId: string): Promise<LeadRow> {
  const { data, error } = await client
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .maybeSingle();

  if (error) {
    console.error("[admin-leads-exa-enrich] Failed to load lead", error);
    throw new HttpError(500, "Failed to load lead");
  }

  if (!data) {
    throw new HttpError(404, "Lead not found");
  }

  return data as LeadRow;
}

async function enrichLeadWithExa(lead: LeadRow): Promise<ExaEnrichmentResult> {
  const apiKey = Deno.env.get("EXA_API_KEY");
  if (!apiKey) {
    throw new HttpError(500, "EXA_API_KEY is not configured");
  }

  const endpoint = Deno.env.get("EXA_ENRICH_URL") ?? "https://api.exa.ai/research";
  const payload = buildExaPayload(lead);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new HttpError(504, "Exa enrichment request timed out");
    }
    throw new HttpError(502, `Unable to reach Exa enrichment API: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  clearTimeout(timeout);

  if (!response.ok) {
    const detail = await safeReadResponse(response);
    throw new HttpError(response.status, `Exa enrichment failed: ${detail}`);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (_error) {
    const detail = await response.text();
    throw new HttpError(502, `Exa enrichment returned invalid JSON: ${detail}`);
  }

  const parsed = parseExaResponse(data);
  return { ...parsed, raw: data };
}

async function persistEnrichment(
  client: SupabaseClient,
  lead: LeadRow,
  enrichment: ExaEnrichmentResult,
): Promise<LeadRow> {
  const metadataKey = "enrichment_metadata" in lead ? "enrichment_metadata" : "metadata";
  const currentMetadataRaw = metadataKey in lead ? (lead as Record<string, unknown>)[metadataKey] : undefined;
  const currentMetadata = isRecord(currentMetadataRaw) ? (currentMetadataRaw as Record<string, unknown>) : {};

  const existingExa = isRecord(currentMetadata.exa_enrichment)
    ? (currentMetadata.exa_enrichment as Record<string, unknown>)
    : {};

  const enrichmentTimestamp = new Date().toISOString();
  const exaMetadata = mergeJson(existingExa, {
    ...enrichment.metadata,
    score: enrichment.score,
    enriched_at: enrichmentTimestamp,
    raw_response: enrichment.raw,
  });

  const updatedMetadata = {
    ...currentMetadata,
    exa_enrichment: exaMetadata,
  };

  const updates: Record<string, Json> = {
    last_enriched_at: enrichmentTimestamp,
    enrichment_status: "enriched",
    lead_score_exa: enrichment.score,
    [metadataKey]: updatedMetadata as Json,
  };

  const { data, error } = await client
    .from("leads")
    .update(updates)
    .eq("id", lead.id)
    .select("*")
    .single();

  if (error) {
    console.error("[admin-leads-exa-enrich] Failed to update lead", error);
    throw new HttpError(500, "Failed to update lead");
  }

  return data as LeadRow;
}

async function markEnrichmentFailed(client: SupabaseClient, leadId: string, reason: string) {
  const { data, error } = await client
    .from("leads")
    .select("metadata, enrichment_metadata")
    .eq("id", leadId)
    .maybeSingle();

  if (error) {
    console.error("[admin-leads-exa-enrich] Unable to fetch lead metadata for failure handling", error);
    return;
  }

  if (!data) {
    return;
  }

  const leadMetadata = data as { metadata?: unknown; enrichment_metadata?: unknown };
  const metadataKey = "enrichment_metadata" in leadMetadata ? "enrichment_metadata" : "metadata";
  const currentMetadata = isRecord(leadMetadata[metadataKey]) ? (leadMetadata[metadataKey] as Record<string, unknown>) : {};
  const existingExa = isRecord(currentMetadata.exa_enrichment)
    ? (currentMetadata.exa_enrichment as Record<string, unknown>)
    : {};

  const timestamp = new Date().toISOString();
  const updates: Record<string, Json> = {
    enrichment_status: "failed",
    last_enriched_at: timestamp,
  };

  updates[metadataKey] = {
    ...currentMetadata,
    exa_enrichment: {
      ...existingExa,
      error: reason,
      updated_at: timestamp,
    },
  } as Json;

  const { error: updateError } = await client
    .from("leads")
    .update(updates)
    .eq("id", leadId);

  if (updateError) {
    console.error("[admin-leads-exa-enrich] Failed to record failure state", updateError);
  }
}

function buildExaPayload(lead: LeadRow): Record<string, unknown> {
  const fullName =
    typeof lead.full_name === "string" && lead.full_name
      ? lead.full_name
      : typeof lead.name === "string" && lead.name
      ? lead.name
      : typeof lead.first_name === "string" || typeof lead.last_name === "string"
      ? `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim()
      : undefined;

  const company =
    typeof lead.company_name === "string" && lead.company_name
      ? lead.company_name
      : typeof lead.company === "string"
      ? lead.company
      : undefined;

  const website =
    typeof lead.website === "string" && lead.website
      ? lead.website
      : typeof lead.company_domain === "string" && lead.company_domain
      ? lead.company_domain
      : typeof lead.domain === "string"
      ? lead.domain
      : undefined;

  const email = typeof lead.email === "string" ? lead.email : typeof lead.work_email === "string" ? lead.work_email : undefined;

  const linkedin =
    typeof lead.linkedin_url === "string"
      ? lead.linkedin_url
      : typeof lead.linkedin === "string"
      ? lead.linkedin
      : typeof lead.linkedin_profile === "string"
      ? lead.linkedin_profile
      : undefined;

  const title =
    typeof lead.title === "string"
      ? lead.title
      : typeof lead.job_title === "string"
      ? lead.job_title
      : typeof lead.role === "string"
      ? lead.role
      : undefined;

  const queryParts = [fullName, company, title, email, linkedin, website].filter((part) => typeof part === "string" && part);

  const payload: Record<string, unknown> = {
    topic: queryParts.join(" \u2022 ") || lead.id,
    lead: removeUndefined({
      id: lead.id,
      name: fullName,
      title,
      email,
      linkedin,
      company,
      website,
    }),
  };

  if (Array.isArray((lead as Record<string, unknown>).tags)) {
    payload.lead = {
      ...(payload.lead as Record<string, unknown>),
      tags: (lead as Record<string, unknown>).tags,
    };
  }

  return payload;
}

function parseExaResponse(payload: unknown): { score: number | null; metadata: Record<string, unknown> } {
  if (!isRecord(payload)) {
    return { score: null, metadata: {} };
  }

  let score: number | null = null;
  const metadata: Record<string, unknown> = {};

  if (typeof payload.score === "number") {
    score = payload.score;
  }

  const scoreCandidates = ["lead_score", "leadScore", "relevance", "confidence", "exa_score"] as const;
  for (const candidate of scoreCandidates) {
    if (score !== null) break;
    const value = payload[candidate as keyof typeof payload];
    const numeric = extractNumeric(value);
    if (numeric !== null) {
      score = numeric;
    }
  }

  if (isRecord(payload.scores)) {
    metadata.scores = payload.scores;
    if (score === null) {
      const overall = extractNumeric((payload.scores as Record<string, unknown>).overall);
      if (overall !== null) {
        score = overall;
      }
    }
  }

  if (isRecord(payload.metadata)) {
    metadata.details = payload.metadata;
  }

  if (typeof payload.summary === "string") {
    metadata.summary = payload.summary;
  }

  if (Array.isArray(payload.insights)) {
    metadata.insights = payload.insights;
  }

  if (Array.isArray(payload.highlights)) {
    metadata.highlights = payload.highlights;
  }

  if (score === null) {
    score = extractNumeric(payload.rating) ?? extractNumeric(payload.rank);
  }

  if (Object.keys(metadata).length === 0) {
    return { score, metadata: payload };
  }

  return { score, metadata };
}

function mergeJson(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };

  for (const [key, value] of Object.entries(source)) {
    if (isRecord(value) && isRecord(result[key])) {
      result[key] = mergeJson(result[key] as Record<string, unknown>, value);
    } else if (value !== undefined) {
      result[key] = value;
    }
  }

  return result;
}

async function safeReadResponse(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 400) || response.statusText;
  } catch (_error) {
    return response.statusText || "Unknown error";
  }
}

function extractNumeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return null;
}

function removeUndefined(record: Record<string, unknown>): Record<string, unknown> {
  const entries = Object.entries(record).filter(([, value]) => value !== undefined && value !== null && value !== "");
  return Object.fromEntries(entries);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

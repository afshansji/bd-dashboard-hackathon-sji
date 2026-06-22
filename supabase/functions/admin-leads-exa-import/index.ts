import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

import { corsHeaders } from "../_shared/cors.ts";

const headers = { ...corsHeaders, "Content-Type": "application/json" } as const;

const RequestSchema = z.object({
  brand_id: z.string().uuid(),
  criteria: z.record(z.unknown()),
  max_results: z.number().int().positive().max(200).optional(),
});

type SupabaseClient = ReturnType<typeof createClient<any, any, any>>;

type JsonRecord = Record<string, unknown>;

interface ExaWebsetNormalized {
  websetId: string | null;
  status: string | null;
  items: unknown[];
  raw: JsonRecord;
}

interface NormalizedLead {
  exaItemId: string | null;
  contactName: string | null;
  companyName: string | null;
  email: string | null;
  website: string | null;
  phone: string | null;
  location: string | null;
  score: number | null;
  metadata: JsonRecord;
}

interface LeadInsertPayload extends JsonRecord {
  brand_id: string;
  name?: string | null;
  company?: string | null;
  email?: string | null;
  website?: string | null;
  phone?: string | null;
  status?: string | null;
  source?: string | null;
  notes?: string | null;
  exa_item_id?: string | null;
  exa_webset_id?: string | null;
  exa_result_url?: string | null;
  exa_score?: number | null;
  exa_metadata?: JsonRecord | null;
  updated_at?: string;
}

const EXA_API_BASE_URL = "https://api.exa.ai";
const WEBSETS_ENDPOINT = "/websets";
const DEFAULT_MAX_RESULTS = 25;
const MAX_POLL_DURATION_MS = 3 * 60 * 1000;
const POLL_INTERVAL_MS = 2000;
const RETRY_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = 750;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Handle test endpoint
  if (req.method === "GET" && new URL(req.url).pathname.endsWith("/test")) {
    const exaApiKey = Deno.env.get("EXA_API_KEY");
    if (!exaApiKey) {
      return jsonResponse({ ok: false, error: "EXA_API_KEY is not configured" }, 200);
    }
    return jsonResponse({ ok: true, configured: true }, 200);
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const exaApiKey = Deno.env.get("EXA_API_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Supabase environment variables are not configured" }, 500);
  }

  if (!exaApiKey) {
    return jsonResponse({ error: "EXA_API_KEY is not configured" }, 500);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch (_error) {
    return jsonResponse({ error: "Invalid JSON payload" }, 400);
  }

  let payload: z.infer<typeof RequestSchema>;
  try {
    payload = RequestSchema.parse(body);
  } catch (error) {
    return jsonResponse({ error: "Invalid request payload", details: formatZodError(error) }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const requestedAt = new Date().toISOString();
  const maxResults = payload.max_results ?? DEFAULT_MAX_RESULTS;
  let jobId: string | null = null;

  try {
    const jobInsert = await supabase
      .from("lead_import_jobs")
      .insert({
        brand_id: payload.brand_id,
        provider: "exa_websets",
        status: "queued",
        requested_payload: {
          criteria: payload.criteria,
          max_results: maxResults,
        } satisfies JsonRecord,
        requested_at: requestedAt,
      })
      .select("id")
      .single();

    if (jobInsert.error) throw jobInsert.error;
    jobId = jobInsert.data.id;

    await supabase
      .from("lead_import_jobs")
      .update({ status: "processing", started_at: new Date().toISOString() })
      .eq("id", jobId);

    const webset = await fetchExaWebset(exaApiKey, payload.criteria, maxResults);
    const normalizedLeads = dedupeLeads(normalizeLeads(webset.items));

    const { toInsert, toUpdate, skipped } = await prepareLeadBatches(
      supabase,
      payload.brand_id,
      webset.websetId,
      normalizedLeads,
    );

    const insertResult = await insertLeads(supabase, toInsert);
    const updateResult = await upsertLeadsById(supabase, toUpdate);

    const resultSummary = {
      job_id: jobId,
      webset_id: webset.websetId,
      total_results: normalizedLeads.length,
      inserted: insertResult.affected,
      updated: updateResult.affected,
      skipped,
    } satisfies JsonRecord;

    await supabase
      .from("lead_import_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        result_summary: resultSummary,
        raw_response: webset.raw,
      })
      .eq("id", jobId);

    return jsonResponse(resultSummary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (jobId) {
      await supabase
        .from("lead_import_jobs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_payload: formatErrorPayload(error),
        })
        .eq("id", jobId);
    }

    console.error("[admin-leads-exa-import]", error);
    return jsonResponse({ error: message, job_id: jobId }, 500);
  }
});

function jsonResponse(body: JsonRecord, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}

function formatZodError(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.flatten();
  }
  return { message: error instanceof Error ? error.message : String(error) };
}

function formatErrorPayload(error: unknown): JsonRecord {
  if (error instanceof z.ZodError) {
    return { type: "validation", issues: error.flatten() };
  }

  if (error instanceof Error) {
    return { type: error.name ?? "Error", message: error.message, stack: error.stack };
  }

  return { type: "unknown", value: error };
}

async function fetchExaWebset(apiKey: string, criteria: JsonRecord, maxResults: number): Promise<ExaWebsetNormalized> {
  const url = `${EXA_API_BASE_URL}${WEBSETS_ENDPOINT}`;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  const payload = JSON.stringify({ criteria, max_results: maxResults });

  const createResponse = await fetchWithRetry(() => fetch(url, { method: "POST", headers, body: payload }));

  if (!createResponse.ok) {
    const text = await createResponse.text();
    throw new Error(`Exa webset request failed (${createResponse.status}): ${text}`);
  }

  const initialJson = (await safeJson(createResponse)) as JsonRecord;
  let normalized = normalizeWebset(initialJson);

  if (normalized.items.length > 0 && isCompletedStatus(normalized.status)) {
    return normalized;
  }

  if (!normalized.websetId) {
    throw new Error("Exa response did not include a webset identifier");
  }

  const deadline = Date.now() + MAX_POLL_DURATION_MS;
  while (Date.now() < deadline) {
    await delay(POLL_INTERVAL_MS);
    const pollResponse = await fetchWithRetry(() => fetch(`${url}/${normalized.websetId}`, { method: "GET", headers }));

    if (!pollResponse.ok) {
      const text = await pollResponse.text();
      throw new Error(`Exa webset polling failed (${pollResponse.status}): ${text}`);
    }

    const pollJson = (await safeJson(pollResponse)) as JsonRecord;
    normalized = normalizeWebset(pollJson);

    if (isCompletedStatus(normalized.status) && normalized.items.length >= 0) {
      return normalized;
    }

    if (isFailedStatus(normalized.status)) {
      throw new Error(`Exa webset returned failure status: ${normalized.status ?? "unknown"}`);
    }
  }

  throw new Error("Timed out while waiting for Exa webset results");
}

async function fetchWithRetry(fetcher: () => Promise<Response>, attempt = 0): Promise<Response> {
  try {
    const response = await fetcher();
    if (shouldRetryResponse(response) && attempt < RETRY_ATTEMPTS) {
      await delay(backoffDelay(attempt));
      return fetchWithRetry(fetcher, attempt + 1);
    }
    return response;
  } catch (error) {
    if (attempt >= RETRY_ATTEMPTS) throw error;
    await delay(backoffDelay(attempt));
    return fetchWithRetry(fetcher, attempt + 1);
  }
}

function shouldRetryResponse(response: Response): boolean {
  if (response.status === 429) return true;
  if (response.status >= 500) return true;
  return false;
}

function backoffDelay(attempt: number): number {
  return RETRY_BACKOFF_MS * Math.max(1, attempt + 1);
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (_error) {
    return {};
  }
}

function normalizeWebset(data: JsonRecord): ExaWebsetNormalized {
  const websetId = extractStringFromPaths(data, [
    "id",
    "webset_id",
    "websetId",
    "webset.id",
    "data.id",
  ]);

  const status = extractStringFromPaths(data, [
    "status",
    "state",
    "webset.status",
    "data.status",
  ]);

  const items = extractArrayFromPaths(data, [
    "items",
    "results",
    "webset.items",
    "webset.results",
    "data.items",
    "data.results",
  ]);

  return {
    websetId,
    status,
    items,
    raw: data,
  };
}

function isCompletedStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  const value = status.toLowerCase();
  return ["ready", "completed", "complete", "done", "finished", "success"].includes(value);
}

function isFailedStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  const value = status.toLowerCase();
  return ["failed", "error", "cancelled", "canceled"].includes(value);
}

function normalizeLeads(items: unknown[]): NormalizedLead[] {
  const results: NormalizedLead[] = [];
  for (const item of items) {
    const normalized = normalizeLeadItem(item);
    if (!normalized) continue;
    if (!normalized.exaItemId && !normalized.email) continue;
    results.push(normalized);
  }
  return results;
}

function normalizeLeadItem(raw: unknown): NormalizedLead | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as JsonRecord;
  const merged: JsonRecord = { ...flattenNested(record), ...record };

  const exaItemId = extractStringFromPaths(merged, [
    "item_id",
    "id",
    "result_id",
    "document_id",
    "item.id",
    "document.id",
  ]);

  const contactName = extractStringFromPaths(merged, [
    "contact_name",
    "name",
    "title",
    "person.name",
    "profile.name",
  ]);

  const companyName = extractStringFromPaths(merged, [
    "company",
    "company_name",
    "organization",
    "employer",
    "profile.company",
  ]);

  const email = extractStringFromPaths(merged, [
    "email",
    "emails",
    "contact.email",
    "profile.email",
    "person.email",
  ]);

  const website = extractStringFromPaths(merged, [
    "url",
    "link",
    "website",
    "profile.url",
    "document.url",
  ]);

  const phone = extractStringFromPaths(merged, [
    "phone",
    "phone_number",
    "contact.phone",
    "profile.phone",
  ]);

  const location = extractStringFromPaths(merged, [
    "location",
    "address",
    "city",
    "profile.location",
  ]);

  const score = extractNumberFromPaths(merged, [
    "score",
    "relevance",
    "ranking",
    "metadata.score",
  ]);

  return {
    exaItemId,
    contactName,
    companyName,
    email: email ? email.toLowerCase() : null,
    website,
    phone,
    location,
    score,
    metadata: toJsonRecord(raw),
  };
}

function dedupeLeads(leads: NormalizedLead[]) {
  const seen = new Set<string>();
  const results: NormalizedLead[] = [];

  for (const lead of leads) {
    const key = lead.exaItemId ?? lead.email;
    if (key) {
      if (seen.has(key)) continue;
      seen.add(key);
    }
    results.push(lead);
  }

  return results;
}

async function prepareLeadBatches(
  client: SupabaseClient,
  brandId: string,
  websetId: string | null,
  leads: NormalizedLead[],
): Promise<{
  toInsert: LeadInsertPayload[];
  toUpdate: (LeadInsertPayload & { id: string })[];
  skipped: number;
}> {
  if (leads.length === 0) {
    return { toInsert: [], toUpdate: [], skipped: 0 };
  }

  const exaIds = Array.from(
    new Set(
      leads
        .map((lead) => lead.exaItemId)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const emails = Array.from(
    new Set(
      leads
        .map((lead) => lead.email)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const existingByExaId = await fetchExistingLeads(client, brandId, "exa_item_id", exaIds);
  const existingByEmail = await fetchExistingLeads(client, brandId, "email", emails, true);

  const toInsert: LeadInsertPayload[] = [];
  const toUpdate: (LeadInsertPayload & { id: string })[] = [];
  let skipped = 0;
  const updatedIds = new Set<string>();

  const now = new Date().toISOString();

  for (const lead of leads) {
    const basePayload = buildLeadPayload(brandId, websetId, lead, now);
    let matchedId: string | null = null;

    if (lead.exaItemId) {
      matchedId = existingByExaId.get(lead.exaItemId) ?? null;
    }

    if (!matchedId && lead.email) {
      matchedId = existingByEmail.get(lead.email) ?? null;
    }

    if (matchedId) {
      if (updatedIds.has(matchedId)) {
        skipped += 1;
        continue;
      }
      updatedIds.add(matchedId);
      toUpdate.push({ id: matchedId, ...basePayload });
      continue;
    }

    toInsert.push(basePayload);
  }

  return { toInsert, toUpdate, skipped };
}

async function fetchExistingLeads(
  client: SupabaseClient,
  brandId: string,
  column: "exa_item_id" | "email",
  values: string[],
  lowercase = false,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (values.length === 0) return map;

  const { data, error } = await client
    .from("leads")
    .select(`id, ${column}`)
    .eq("brand_id", brandId)
    .in(column, values);
  if (error || !data) return map;

  for (const row of data as Array<{ id?: string; [key: string]: unknown }>) {
    if (!row.id) continue;
    const keyValue = row[column];
    if (typeof keyValue !== "string") continue;
    const key = lowercase ? keyValue.toLowerCase() : keyValue;
    map.set(key, row.id);
  }

  return map;
}

function buildLeadPayload(
  brandId: string,
  websetId: string | null,
  lead: NormalizedLead,
  updatedAt: string,
): LeadInsertPayload {
  const payload: LeadInsertPayload = {
    brand_id: brandId,
    name: lead.contactName ?? lead.companyName ?? null,
    company: lead.companyName ?? null,
    email: lead.email ?? null,
    website: lead.website ?? null,
    phone: lead.phone ?? null,
    status: "new",
    source: "exa_websets",
    exa_item_id: lead.exaItemId,
    exa_webset_id: websetId,
    exa_result_url: lead.website,
    exa_score: lead.score,
    exa_metadata: lead.metadata,
    updated_at: updatedAt,
  };

  return payload;
}

async function insertLeads(client: SupabaseClient, batch: LeadInsertPayload[]): Promise<{ affected: number }> {
  if (batch.length === 0) return { affected: 0 };

  const { error, data } = await client.from("leads").insert(batch).select("id");
  if (error) throw error;
  return { affected: Array.isArray(data) ? data.length : 0 };
}

async function upsertLeadsById(
  client: SupabaseClient,
  batch: (LeadInsertPayload & { id: string })[],
): Promise<{ affected: number }> {
  if (batch.length === 0) return { affected: 0 };

  const { error, data } = await client.from("leads").upsert(batch, { onConflict: "id" }).select("id");
  if (error) throw error;
  return { affected: Array.isArray(data) ? data.length : 0 };
}

function extractStringFromPaths(record: JsonRecord, paths: string[]): string | null {
  for (const path of paths) {
    const value = getValue(record, path);
    const stringValue = extractFirstString(value);
    if (stringValue) {
      return stringValue;
    }
  }
  return null;
}

function extractNumberFromPaths(record: JsonRecord, paths: string[]): number | null {
  for (const path of paths) {
    const value = getValue(record, path);
    const numValue = extractNumber(value);
    if (numValue !== null) {
      return numValue;
    }
  }
  return null;
}

function extractArrayFromPaths(record: JsonRecord, paths: string[]): unknown[] {
  for (const path of paths) {
    const value = getValue(record, path);
    if (Array.isArray(value)) {
      return value;
    }
  }
  return [];
}

function extractFirstString(value: unknown): string | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const result = extractFirstString(item);
      if (result) return result;
    }
    return null;
  }

  if (typeof value === "object") {
    const record = value as JsonRecord;
    if (typeof record.value === "string") return cleanString(record.value);
    if (typeof record.name === "string") return cleanString(record.name);
    if (typeof record.email === "string") return cleanString(record.email);
    if (typeof record.url === "string") return cleanString(record.url);
  }

  if (typeof value === "string") return cleanString(value);
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;

  return null;
}

function extractNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function getValue(record: JsonRecord, path: string): unknown {
  const segments = path.split(".");
  let current: unknown = record;
  for (const segment of segments) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as JsonRecord)[segment];
  }
  return current;
}

function cleanString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function flattenNested(record: JsonRecord, prefix = ""): JsonRecord {
  const result: JsonRecord = {};
  for (const [key, value] of Object.entries(record)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(result, flattenNested(value as JsonRecord, path));
    } else {
      result[path] = value;
    }
  }
  return result;
}

function toJsonRecord(value: unknown): JsonRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonRecord;
  }
  return { value };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

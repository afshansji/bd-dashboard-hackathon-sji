import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { validateApiSecret } from "../_shared/externalApiAuth.ts";
import { aggregateUserAnalytics, type AnalyticsPeriod } from "../_shared/analyticsAggregator.ts";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function badRequest(message: string) {
  return jsonResponse({ error: message }, 400);
}

function forbidden(message: string) {
  return jsonResponse({ error: message }, 403);
}

function unauthorized(message: string) {
  return jsonResponse({ error: message }, 401);
}

function parsePeriod(value: string | null): AnalyticsPeriod | null {
  if (!value) return null;
  if (value === "daily" || value === "weekly" || value === "monthly" || value === "all") return value;
  return null;
}

function parseDateParam(value: string | null): Date | null {
  if (!value) return null;
  // Expect YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

function parsePageSize(value: string | null, fallback: number): number {
  const n = parsePositiveInt(value, fallback);
  return Math.min(n, 200);
}

function isLikelyEmail(value: string): boolean {
  // Keep permissive: basic sanity check only.
  return value.includes("@");
}

function parseEmailFilter(url: URL): string[] | null {
  const rawValues = url.searchParams.getAll("email");
  if (rawValues.length === 0) return null;

  const candidates: string[] = [];
  for (const raw of rawValues) {
    for (const part of raw.split(",")) {
      const normalized = part.trim().toLowerCase();
      if (!normalized) continue;
      if (!isLikelyEmail(normalized)) continue;
      candidates.push(normalized);
    }
  }

  const deduped = Array.from(new Set(candidates));
  return deduped.length > 0 ? deduped : null;
}

function computeDateRange(period: AnalyticsPeriod, end: Date) {
  const endDate = end;
  const endMs = endDate.getTime();
  let startMs = endMs;

  switch (period) {
    case "daily":
      startMs = endMs - 24 * 60 * 60 * 1000;
      break;
    case "weekly":
      startMs = endMs - 7 * 24 * 60 * 60 * 1000;
      break;
    case "monthly":
      startMs = endMs - 30 * 24 * 60 * 60 * 1000;
      break;
    case "all":
      startMs = endMs - 90 * 24 * 60 * 60 * 1000;
      break;
  }

  return { periodStart: new Date(startMs), periodEnd: endDate };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const consumer = await validateApiSecret(req, supabase);

    const url = new URL(req.url);
    const period = parsePeriod(url.searchParams.get("period"));
    if (!period) {
      return badRequest("Missing or invalid 'period'. Expected one of: daily, weekly, monthly, all.");
    }

    const allowedPeriods = Array.isArray(consumer.allowed_periods) ? consumer.allowed_periods : [];
    if (allowedPeriods.length > 0 && !allowedPeriods.includes(period)) {
      return forbidden(`Consumer is not allowed to request period '${period}'.`);
    }

    const endDate = parseDateParam(url.searchParams.get("date")) ?? new Date();
    if (!endDate) {
      return badRequest("Invalid 'date'. Expected YYYY-MM-DD.");
    }

    const page = parsePositiveInt(url.searchParams.get("page"), 1);
    const pageSize = parsePageSize(url.searchParams.get("page_size"), 50);
    const emailFilter = parseEmailFilter(url);

    const { periodStart, periodEnd } = computeDateRange(period, endDate);

    console.log(
      `[external-analytics-api] consumer=${consumer.name} period=${period} page=${page} page_size=${pageSize} email_filter_count=${emailFilter?.length ?? 0}`,
    );

    const result = await aggregateUserAnalytics(supabase, {
      period,
      periodStart,
      periodEnd,
      page,
      pageSize,
      emailFilter,
    });

    return jsonResponse(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";

    if (message.includes("Missing API key")) {
      return unauthorized("Missing Authorization: Bearer <apiKey>");
    }
    if (message.includes("Invalid API key")) {
      return unauthorized("Invalid API key");
    }

    console.error("[external-analytics-api] Error:", error);
    return jsonResponse({ error: message }, 500);
  }
});


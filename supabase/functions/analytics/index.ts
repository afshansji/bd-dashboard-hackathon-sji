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

function notFound(message: string) {
  return jsonResponse({ error: message }, 404);
}

function unauthorized(message: string) {
  return jsonResponse({ error: message }, 401);
}

function isLikelyEmail(value: string): boolean {
  // Keep permissive: basic sanity check only.
  return value.includes("@");
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

function routeSegmentsForFunction(url: URL, functionName: string): string[] {
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.lastIndexOf(functionName);
  return idx >= 0 ? parts.slice(idx + 1) : [];
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

    // Require API key for all routes (ping/health included).
    await validateApiSecret(req, supabase);

    const url = new URL(req.url);
    const route = routeSegmentsForFunction(url, "analytics");

    // GET /analytics or GET /analytics/ping or GET /analytics/health
    if (route.length === 0 || route[0] === "ping" || route[0] === "health") {
      return jsonResponse({ ok: true }, 200);
    }

    // GET /analytics/users/:email
    if (route[0] === "users") {
      const rawEmail = route[1];
      if (!rawEmail) return badRequest("Missing user email in path. Expected /analytics/users/:email");

      const email = decodeURIComponent(rawEmail).trim().toLowerCase();
      if (!email || !isLikelyEmail(email)) return badRequest("Invalid email in path.");

      const period: AnalyticsPeriod = "all";
      const endDate = new Date();
      const { periodStart, periodEnd } = computeDateRange(period, endDate);

      const result = await aggregateUserAnalytics(supabase, {
        period,
        periodStart,
        periodEnd,
        page: 1,
        pageSize: 1,
        emailFilter: [email],
      });

      const stats = Object.values(result.users)[0] ?? null;
      if (!stats) return notFound("No analytics found for that user in the selected window.");

      return jsonResponse(
        {
          summary: {
            activityScore: stats.activity_score,
            activityCount: stats.activity_count,
            loginCount: stats.login_count,
          },
          details: {
            name: stats.name,
            email: stats.email,
            activityScore: stats.activity_score,
            activityCount: stats.activity_count,
            loginCount: stats.login_count,
            lastLoginAt: stats.last_login_at,
            inactiveForSeconds: stats.inactive_for_seconds,
            activityBreakdown: stats.activity_breakdown,
          },
          lastActiveAt: stats.last_active_at,
        },
        200,
      );
    }

    return jsonResponse({ error: "Not Found" }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";

    if (message.includes("Missing API key")) {
      return unauthorized("Missing Authorization: Bearer <apiKey>");
    }
    if (message.includes("Invalid API key")) {
      return unauthorized("Invalid API key");
    }

    console.error("[analytics] Error:", error);
    return jsonResponse({ error: message }, 500);
  }
});


import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  createAuthedClient,
  requireManagerOrAdmin,
  requireUserId,
} from "../_shared/orgMemory.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const client = createAuthedClient(req);
    const userId = await requireUserId(client);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const limit = Math.min(
      Math.max(Number(url.searchParams.get("limit") ?? "20"), 1),
      100,
    );

    const isManager = await requireManagerOrAdmin(client);

    let query = client
      .from("org_memory_runs")
      .select(
        "id, trace_id, query, requested_capabilities, execution_plan, status, started_at, completed_at, error_message",
      )
      .order("started_at", { ascending: false })
      .limit(limit);

    if (!isManager) {
      query = query.eq("executed_by", userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return new Response(JSON.stringify({ runs: data ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("org-memory-runs error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

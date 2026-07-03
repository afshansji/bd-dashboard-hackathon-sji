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

const V1_CAPABILITIES = [
  "repository_discovery",
  "project_understanding",
  "knowledge_retrieval",
] as const;

const QuerySchema = z.object({
  query: z.string().min(3).max(2000),
  capabilities: z.array(z.enum(V1_CAPABILITIES)).min(1),
  filters: z
    .object({
      techStack: z.array(z.string()).optional(),
      industry: z.string().optional(),
      clientId: z.string().uuid().optional(),
      repoIds: z.array(z.string().uuid()).optional(),
      projectIds: z.array(z.string().uuid()).optional(),
    })
    .optional(),
  options: z
    .object({
      maxRepos: z.number().int().positive().max(50).optional(),
      maxChunks: z.number().int().positive().max(100).optional(),
      includeCitations: z.boolean().optional(),
      searchAllRepos: z.boolean().optional(),
    })
    .optional(),
});

async function proxyToWorkflowService(
  traceId: string,
  payload: z.infer<typeof QuerySchema>,
) {
  const serviceUrl = Deno.env.get("ORG_MEMORY_SERVICE_URL");
  if (!serviceUrl) return null;

  const serviceKey = Deno.env.get("ORG_MEMORY_SERVICE_KEY") ?? "";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (serviceKey) headers["x-org-memory-key"] = serviceKey;

  const res = await fetch(`${serviceUrl.replace(/\/$/, "")}/query`, {
    method: "POST",
    headers,
    body: JSON.stringify({ traceId, ...payload }),
  });

  const body = await res.json();
  return { ok: res.ok, status: res.status, body };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
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

    const json = await req.json();
    const payload = QuerySchema.parse(json);
    const traceId = newTraceId();
    const serviceClient = createServiceClient();

    const { data: runRow, error: runInsertError } = await serviceClient
      .from("org_memory_runs")
      .insert({
        trace_id: traceId,
        executed_by: userId,
        query: payload.query,
        requested_capabilities: payload.capabilities,
        status: "running",
      })
      .select("id")
      .single();

    if (runInsertError) {
      console.error("org_memory_runs insert failed:", runInsertError);
      throw runInsertError;
    }

    const proxied = await proxyToWorkflowService(traceId, payload);

    let result: Record<string, unknown>;
    let httpStatus = 200;

    if (proxied?.ok) {
      result = proxied.body as Record<string, unknown>;
    } else if (proxied && !proxied.ok) {
      result = proxied.body as Record<string, unknown>;
      httpStatus = proxied.status;
    } else {
      console.log("ORG_MEMORY_SERVICE_URL not set — using edge fallback");
      result = await runOrgMemoryQueryFallback(
        serviceClient,
        traceId,
        payload,
      ) as Record<string, unknown>;
    }

    const failed = httpStatus >= 400 || result.status === "failed";

    await serviceClient
      .from("org_memory_runs")
      .update({
        status: failed ? "failed" : "completed",
        execution_plan: (result.executionPlan as string[]) ?? payload.capabilities,
        response: result,
        node_telemetry: (result.telemetry as { nodes?: unknown })?.nodes ?? [],
        completed_at: new Date().toISOString(),
        error_message: failed
          ? (typeof result.error === "string" ? result.error : "Query failed")
          : null,
      })
      .eq("id", runRow.id);

    return new Response(
      JSON.stringify({ ...result, runId: runRow.id }),
      {
        status: httpStatus,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("org-memory-query error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: error instanceof z.ZodError ? 400 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

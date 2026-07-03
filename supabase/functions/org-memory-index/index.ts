import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  callOrgMemoryService,
  createAuthedClient,
  createServiceClient,
  requireManagerOrAdmin,
  requireUserId,
} from "../_shared/orgMemory.ts";

const IndexRequestSchema = z.object({
  repositoryId: z.string().uuid().optional(),
  force: z.boolean().optional(),
});

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

    const isManager = await requireManagerOrAdmin(client);
    if (!isManager) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = IndexRequestSchema.parse(await req.json());
    const serviceClient = createServiceClient();

    let repoQuery = serviceClient
      .from("org_repositories")
      .select("id, name, index_status")
      .eq("is_active", true);

    if (body.repositoryId) {
      repoQuery = repoQuery.eq("id", body.repositoryId);
    }

    const { data: repos, error: reposError } = await repoQuery;
    if (reposError) throw reposError;

    if (!repos || repos.length === 0) {
      return new Response(
        JSON.stringify({ error: "No active repositories found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const results: Array<{
      repositoryId: string;
      indexRunId: string;
      status: string;
      error?: string;
    }> = [];

    for (const repo of repos) {
      if (!body.force && repo.index_status === "running") {
        continue;
      }

      const { data: indexRun, error: indexRunError } = await serviceClient
        .from("org_index_runs")
        .insert({
          repository_id: repo.id,
          status: "running",
          telemetry: { phase: 1, enqueuedBy: userId },
        })
        .select("id")
        .single();

      if (indexRunError) throw indexRunError;

      await serviceClient
        .from("org_repositories")
        .update({
          index_status: "running",
          index_error: null,
        })
        .eq("id", repo.id);

      const serviceRes = await callOrgMemoryService("/index", {
        repositoryId: repo.id,
        indexRunId: indexRun.id,
      });

      if (!serviceRes) {
        results.push({
          repositoryId: repo.id,
          indexRunId: indexRun.id,
          status: "pending_service",
          error:
            "ORG_MEMORY_SERVICE_URL not configured. Run services/org-memory locally (or ngrok) and set the secret.",
        });
        continue;
      }

      const serviceBody = await serviceRes.json();
      results.push({
        repositoryId: repo.id,
        indexRunId: indexRun.id,
        status: serviceRes.ok ? "completed" : "failed",
        error: serviceRes.ok
          ? undefined
          : (serviceBody.error ?? serviceBody.errorMessage),
      });
    }

    return new Response(
      JSON.stringify({
        message: "Indexing complete",
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("org-memory-index error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: error instanceof z.ZodError ? 400 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

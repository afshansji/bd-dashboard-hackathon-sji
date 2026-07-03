import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  createAuthedClient,
  createServiceClient,
  readJsonBody,
  requireManagerOrAdmin,
  requireUserId,
} from "../_shared/orgMemory.ts";

const CreateRepoSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url(),
  defaultBranch: z.string().min(1).max(100).default("main"),
  provider: z.enum(["github", "gitlab", "bitbucket"]).default("github"),
  tags: z.array(z.string()).optional(),
});

const PatchRepoSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  defaultBranch: z.string().min(1).max(100).optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

function errorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.errors.map((e) => e.message).join("; ");
  }
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const row = error as { message?: string; details?: string; hint?: string; code?: string };
    return [row.message, row.details, row.hint].filter(Boolean).join(" — ") ||
      row.code ||
      "Unknown error";
  }
  return "Unknown error";
}

function errorStatus(error: unknown): number {
  if (error instanceof z.ZodError) return 400;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("request body") || msg.includes("invalid json")) return 400;
  }
  if (error && typeof error === "object") {
    const code = (error as { code?: string }).code;
    if (code === "23505") return 409;
    if (code === "42501") return 403;
    if (code === "23503") return 400;
  }
  return 500;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authedClient = createAuthedClient(req);
    const userId = await requireUserId(authedClient);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createServiceClient();

    if (req.method === "GET") {
      const { data, error } = await authedClient
        .from("org_repositories")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ repositories: data ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = CreateRepoSchema.parse(await readJsonBody(req));

      const { data: profile, error: profileError } = await serviceClient
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) {
        return new Response(
          JSON.stringify({
            error: "Your user profile was not found. Try logging out and back in.",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const { data, error } = await serviceClient
        .from("org_repositories")
        .insert({
          name: body.name,
          url: body.url,
          default_branch: body.defaultBranch,
          provider: body.provider,
          tags: body.tags ?? [],
          created_by: userId,
          index_status: "pending",
        })
        .select("*")
        .single();

      if (error) {
        if (error.code === "23505") {
          const { data: existing, error: existingError } = await serviceClient
            .from("org_repositories")
            .select("*")
            .eq("url", body.url)
            .single();
          if (existingError) throw existingError;
          return new Response(
            JSON.stringify({
              repository: existing,
              existing: true,
              message: "Repository already registered",
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
        throw error;
      }

      return new Response(
        JSON.stringify({ repository: data, existing: false }),
        {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (req.method === "PATCH") {
      const isManager = await requireManagerOrAdmin(authedClient);
      if (!isManager) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = PatchRepoSchema.parse(await readJsonBody(req));
      const updates: Record<string, unknown> = {};
      if (body.name !== undefined) updates.name = body.name;
      if (body.defaultBranch !== undefined) {
        updates.default_branch = body.defaultBranch;
      }
      if (body.tags !== undefined) updates.tags = body.tags;
      if (body.isActive !== undefined) updates.is_active = body.isActive;

      const { data, error } = await serviceClient
        .from("org_repositories")
        .update(updates)
        .eq("id", body.id)
        .select("*")
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ repository: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("org-memory-repos error:", error);
    const message = errorMessage(error);
    return new Response(JSON.stringify({ error: message }), {
      status: errorStatus(error),
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

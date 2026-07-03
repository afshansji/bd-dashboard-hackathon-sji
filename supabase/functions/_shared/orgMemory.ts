import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export function createAuthedClient(req: Request): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing Supabase configuration");
  }

  return createClient(supabaseUrl, serviceKey, {
    global: {
      headers: { Authorization: req.headers.get("Authorization") ?? "" },
    },
    auth: { persistSession: false },
  });
}

export async function requireUserId(
  client: SupabaseClient,
): Promise<string | null> {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

export async function requireManagerOrAdmin(
  client: SupabaseClient,
): Promise<boolean> {
  const { data, error } = await client.rpc("is_manager_or_admin");
  if (error) {
    console.error("is_manager_or_admin RPC failed:", error);
    return false;
  }
  return Boolean(data);
}

export function createServiceClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing Supabase configuration");
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function newTraceId(): string {
  return `tr_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

export async function readJsonBody(req: Request): Promise<unknown> {
  const text = await req.text();
  if (!text.trim()) {
    throw new Error("Request body is required");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON in request body");
  }
}

export async function callOrgMemoryService(
  path: string,
  body: Record<string, unknown>,
): Promise<Response | null> {
  const serviceUrl = Deno.env.get("ORG_MEMORY_SERVICE_URL");
  if (!serviceUrl) return null;

  const serviceKey = Deno.env.get("ORG_MEMORY_SERVICE_KEY") ?? "";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (serviceKey) headers["x-org-memory-key"] = serviceKey;

  return fetch(`${serviceUrl.replace(/\/$/, "")}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

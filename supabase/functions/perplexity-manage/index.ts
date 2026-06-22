import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders } from "../_shared/cors.ts";

type IntegrationRow = {
  id: string;
  name: string | null;
  type: string;
  config: Record<string, unknown> | null;
  is_active: boolean | null;
  last_sync: string | null;
};

type PerplexityConfig = {
  model: string;
  cost_per_1k_tokens: number;
};

type PerplexityModel = {
  id: string;
  label: string;
  cost: number;
};

const DEFAULT_CONFIG: PerplexityConfig = {
  model: "sonar",
  cost_per_1k_tokens: 1.0,
};

const AVAILABLE_MODELS: PerplexityModel[] = [
  { id: "sonar", label: "Sonar (Llama 3.3 70B)", cost: 1.0 },
  { id: "sonar-pro", label: "Sonar Pro (Advanced)", cost: 5.0 },
  { id: "sonar-reasoning", label: "Sonar Reasoning", cost: 5.0 },
  { id: "llama-3.1-sonar-small-128k-online", label: "Llama 3.1 Sonar Small (8B)", cost: 0.2 },
  { id: "llama-3.1-sonar-large-128k-online", label: "Llama 3.1 Sonar Large (70B)", cost: 1.0 },
  { id: "llama-3.1-sonar-huge-128k-online", label: "Llama 3.1 Sonar Huge (405B)", cost: 5.0 },
];

async function createSupabaseClient(req: Request): Promise<SupabaseClient> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase environment variables are not configured");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
}

async function requireAuth(client: SupabaseClient): Promise<boolean> {
  const { data } = await client.auth.getUser();
  return Boolean(data.user?.id);
}

function parseConfig(config: Record<string, unknown> | null | undefined): PerplexityConfig {
  const model = typeof config?.model === "string" ? config.model : DEFAULT_CONFIG.model;
  const costValue =
    typeof config?.cost_per_1k_tokens === "number"
      ? config.cost_per_1k_tokens
      : Number(config?.cost_per_1k_tokens);
  const cost = Number.isFinite(costValue) && costValue !== null ? Number(costValue) : DEFAULT_CONFIG.cost_per_1k_tokens;
  return { model, cost_per_1k_tokens: Number(cost.toFixed(2)) };
}

async function fetchIntegration(client: SupabaseClient): Promise<IntegrationRow | null> {
  const { data } = await client
    .from("integrations")
    .select("id, name, type, config, is_active, last_sync")
    .eq("type", "perplexity")
    .maybeSingle();

  return data ?? null;
}

function toNumber(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || Number.isNaN(numeric)) {
    throw new Error("Invalid numeric value provided");
  }
  return Number(numeric.toFixed(4));
}

async function handleGet(req: Request): Promise<Response> {
  const headers = { ...corsHeaders, "Content-Type": "application/json" };
  try {
    const client = await createSupabaseClient(req);
    const authed = await requireAuth(client);
    if (!authed) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { headers, status: 401 });
    }

    const integration = await fetchIntegration(client);
    const config = parseConfig(integration?.config as Record<string, unknown> | null | undefined);

    return new Response(
      JSON.stringify({
        ok: true,
        integration: integration
          ? {
              ...integration,
              config,
              is_active: Boolean(integration.is_active),
            }
          : null,
        config,
      }),
      { headers },
    );
  } catch (error) {
    console.error("[Perplexity] GET", error);
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }), {
      headers,
      status: 500,
    });
  }
}

async function handleGetModels(req: Request): Promise<Response> {
  const headers = { ...corsHeaders, "Content-Type": "application/json" };
  try {
    const client = await createSupabaseClient(req);
    const authed = await requireAuth(client);
    if (!authed) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { headers, status: 401 });
    }

    return new Response(JSON.stringify({ ok: true, models: AVAILABLE_MODELS }), { headers });
  } catch (error) {
    console.error("[Perplexity] models", error);
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }), {
      headers,
      status: 500,
    });
  }
}

async function handleTest(req: Request): Promise<Response> {
  const headers = { ...corsHeaders, "Content-Type": "application/json" };
  try {
    const client = await createSupabaseClient(req);
    const authed = await requireAuth(client);
    if (!authed) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { headers, status: 401 });
    }

    let modelParam: string | null = null;

    // Handle both GET with query params and POST with body
    if (req.method === "GET") {
      const url = new URL(req.url);
      modelParam = url.searchParams.get("model");
    } else if (req.method === "POST") {
      const payload = await req.json();
      modelParam = payload?.model || null;
    }

    const integration = await fetchIntegration(client);
    const config = parseConfig(integration?.config as Record<string, unknown> | null | undefined);
    const model = modelParam || config.model || DEFAULT_CONFIG.model;

    const apiKey = Deno.env.get("PERPLEXITY_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: "PERPLEXITY_API_KEY not configured" }), {
        headers,
        status: 500,
      });
    }

    const body = {
      model,
      messages: [
        {
          role: "user",
          content: "What is SJ Innovation?",
        },
      ],
    };

    const start = performance.now();
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const latencyMs = Math.round(performance.now() - start);

    const text = await response.text();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          error:
            typeof parsed === "string"
              ? parsed
              : (parsed as Record<string, unknown>)?.error ?? "Perplexity API request failed",
          status: response.status,
        }),
        { headers, status: response.status },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        status: response.status,
        latency_ms: latencyMs,
        model,
        response: parsed,
      }),
      { headers },
    );
  } catch (error) {
    console.error("[Perplexity] test", error);
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }), {
      headers,
      status: 500,
    });
  }
}

async function handleSaveConfig(req: Request): Promise<Response> {
  const headers = { ...corsHeaders, "Content-Type": "application/json" };
  try {
    const client = await createSupabaseClient(req);
    const authed = await requireAuth(client);
    if (!authed) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { headers, status: 401 });
    }

    const payload = await req.json();
    const rawModel = payload?.model;
    const isActive = Boolean(payload?.is_active ?? true);

    if (!rawModel || typeof rawModel !== "string") {
      return new Response(JSON.stringify({ ok: false, error: "Model is required" }), { headers, status: 400 });
    }

    let cost = DEFAULT_CONFIG.cost_per_1k_tokens;
    try {
      cost = toNumber(payload?.cost_per_1k_tokens ?? DEFAULT_CONFIG.cost_per_1k_tokens);
    } catch (error) {
      return new Response(
        JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Invalid cost value" }),
        { headers, status: 400 },
      );
    }

    const config: PerplexityConfig = {
      model: rawModel,
      cost_per_1k_tokens: cost,
    };

    const existing = await fetchIntegration(client);

    if (existing) {
      const { error } = await client
        .from("integrations")
        .update({
          name: "Perplexity AI",
          config,
          is_active: isActive,
        })
        .eq("id", existing.id);

      if (error) {
        throw error;
      }
    } else {
      const { error } = await client.from("integrations").insert({
        name: "Perplexity AI",
        type: "perplexity",
        config,
        is_active: isActive,
      });

      if (error) {
        throw error;
      }
    }

    return new Response(JSON.stringify({ ok: true, config, is_active: isActive }), { headers });
  } catch (error) {
    console.error("[Perplexity] save", error);
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }), {
      headers,
      status: 500,
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathname = url.pathname.replace(/\/perplexity-manage/, "") || "/";

  if (req.method === "GET" && pathname === "/") {
    return handleGet(req);
  }

  if (req.method === "GET" && pathname === "/models") {
    return handleGetModels(req);
  }

  if ((req.method === "GET" || req.method === "POST") && pathname === "/test") {
    return handleTest(req);
  }

  if (req.method === "POST" && pathname === "/save-config") {
    return handleSaveConfig(req);
  }

  return new Response(JSON.stringify({ ok: false, error: "Not Found" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 404,
  });
});

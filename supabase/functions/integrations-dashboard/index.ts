import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders } from "../_shared/cors.ts";
import { decryptSecret } from "../_shared/crypto.ts";

type HubSpotIntegration = {
  id: string;
  name: string | null;
  type: string;
  config: Record<string, any> | null;
  is_active: boolean;
  last_sync: string | null;
};

type GHLIntegration = {
  id: string;
  user_id: string;
  location_id: string | null;
  is_active: boolean | null;
  updated_at: string;
};

async function createSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase environment variables are not configured");
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

async function handleGetDashboard() {
  const headers = { ...corsHeaders, "Content-Type": "application/json" };
  try {
    const supabase = await createSupabaseClient();

    const { data: hubspot } = await supabase
      .from("integrations")
      .select("id, name, type, config, is_active, last_sync")
      .eq("type", "hubspot")
      .maybeSingle();

    const { data: gohighlevel } = await supabase
      .from("gohighlevel_integrations")
      .select("id, user_id, location_id, is_active, updated_at")
      .eq("is_active", true);

    const ghlEntries = (gohighlevel ?? []).map((item) => ({
      id: item.id,
      name: "GoHighLevel",
      type: "gohighlevel",
      status: item.is_active ? "active" : "inactive",
      is_active: Boolean(item.is_active),
      last_sync: item.updated_at,
      metadata: {
        location_id: item.location_id,
      },
    }));

    const hubspotEntry = hubspot
      ? [{
        id: hubspot.id,
        name: hubspot.name ?? "HubSpot",
        type: "hubspot",
        status: hubspot.is_active ? "active" : "inactive",
        is_active: hubspot.is_active,
        last_sync: hubspot.last_sync,
        metadata: {
          portal_id: hubspot.config?.portal_id ?? null,
        },
      }]
      : [];

    return new Response(JSON.stringify({
      ok: true,
      integrations: [...hubspotEntry, ...ghlEntries],
    }), { headers });
  } catch (error) {
    console.error("[Integrations Dashboard]", error);
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }), {
      headers,
      status: 500,
    });
  }
}

async function handlePatchStatus(req: Request): Promise<Response> {
  const headers = { ...corsHeaders, "Content-Type": "application/json" };
  try {
    const body = await req.json();
    const { id, type, is_active } = body ?? {};
    if (!id || !type || typeof is_active !== "boolean") {
      return new Response(JSON.stringify({ ok: false, error: "Invalid payload" }), { headers, status: 400 });
    }

    const supabase = await createSupabaseClient();

    if (type === "hubspot") {
      const { error } = await supabase
        .from("integrations")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    } else if (type === "gohighlevel") {
      const { error } = await supabase
        .from("gohighlevel_integrations")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    } else {
      return new Response(JSON.stringify({ ok: false, error: "Unsupported integration type" }), { headers, status: 400 });
    }

    return new Response(JSON.stringify({ ok: true }), { headers });
  } catch (error) {
    console.error("[Integrations Dashboard PATCH]", error);
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }), {
      headers,
      status: 500,
    });
  }
}

async function handleSecret(req: Request): Promise<Response> {
  const headers = { ...corsHeaders, "Content-Type": "application/json" };
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    const supabase = await createSupabaseClient();

    if (type === "hubspot") {
      const { data } = await supabase
        .from("integrations")
        .select("config")
        .eq("type", "hubspot")
        .maybeSingle();
      const token = await decryptSecret(data?.config?.api_key_encrypted ?? null);
      return new Response(JSON.stringify({ ok: true, tokenPresent: Boolean(token) }), { headers });
    }

    if (type === "gohighlevel") {
      const { data } = await supabase
        .from("gohighlevel_integrations")
        .select("api_key_encrypted")
        .eq("is_active", true)
        .maybeSingle();
      const token = await decryptSecret(data?.api_key_encrypted ?? null);
      return new Response(JSON.stringify({ ok: true, tokenPresent: Boolean(token) }), { headers });
    }

    return new Response(JSON.stringify({ ok: false, error: "Unsupported integration type" }), { headers, status: 400 });
  } catch (error) {
    console.error("[Integrations Dashboard Secret]", error);
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
  const pathname = url.pathname.replace(/\/integrations-dashboard/, "") || "/";

  if (req.method === "GET" && pathname === "/") {
    return handleGetDashboard();
  }

  if (req.method === "GET" && pathname === "/secret") {
    return handleSecret(req);
  }

  if (req.method === "PATCH" && pathname === "/") {
    return handlePatchStatus(req);
  }

  return new Response(JSON.stringify({ error: "Not Found" }), {
    status: 404,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

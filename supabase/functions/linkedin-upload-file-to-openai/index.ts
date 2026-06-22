import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

import { corsHeaders } from "../_shared/cors.ts";

const PayloadSchema = z.object({
  agent_id: z.string().uuid(),
  file_id: z.string().min(1),
  file_name: z.string().min(1),
  vector_store_id: z.string().min(1).optional(),
  mime_type: z.string().optional(),
});

async function getClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) {
    throw new Error("Missing Supabase credentials");
  }
  return createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const client = await getClient();
    const payload = PayloadSchema.parse(await req.json());

    const { data: agent, error: agentError } = await client
      .from("ai_agents")
      .select("id")
      .eq("id", payload.agent_id)
      .single();

    if (agentError || !agent) {
      return new Response(JSON.stringify({ error: "Agent not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metadata = {
      fileName: payload.file_name,
      mimeType: payload.mime_type ?? "application/pdf",
      uploadedAt: new Date().toISOString(),
    };

    const inserts = [
      {
        agent_id: payload.agent_id,
        resource_type: "document",
        resource_identifier: payload.file_id,
        metadata,
      },
    ];

    if (payload.vector_store_id) {
      inserts.push({
        agent_id: payload.agent_id,
        resource_type: "vector_store",
        resource_identifier: payload.vector_store_id,
        metadata: {
          fileName: `LinkedIn upload backing store for ${payload.file_name}`,
          mimeType: "application/octet-stream",
          uploadedAt: new Date().toISOString(),
        },
      });
    }

    const { data, error } = await client
      .from("ai_shared_resources")
      .upsert(inserts, { onConflict: "agent_id,resource_identifier" })
      .select();

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ success: true, resources: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("linkedin-upload-file-to-openai error", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

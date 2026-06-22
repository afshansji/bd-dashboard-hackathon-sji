import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { agent_id, user_id, message, limit = 5 } = (await req.json()) as {
      agent_id: string;
      user_id: string;
      message: string;
      limit?: number;
    };
    if (!agent_id || !user_id) {
      return new Response(
        JSON.stringify({ error: "agent_id and user_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const query = (message || "").trim() || "general context";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    let embedding: number[] | null = null;

    try {
      const embedRes = await fetch(`${supabaseUrl}/functions/v1/generate-embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({ text: query }),
      });
      if (embedRes.ok) {
        const { embeddings } = await embedRes.json();
        embedding = Array.isArray(embeddings) ? embeddings : null;
      }
    } catch {
      // continue without semantic search
    }

    type MemRow = { id: string; content: string; memory_category?: string; importance_score?: number; similarity?: number; created_at?: string };
    const byId = new Map<string, MemRow>();

    if (embedding && embedding.length === 1536) {
      const { data: rows, error } = await supabase.rpc("get_relevant_memories", {
        p_agent_id: agent_id,
        p_user_id: user_id,
        p_embedding: embedding,
        p_limit: limit,
        p_similarity_threshold: 0.3,
      });
      if (!error && rows?.length) {
        for (const r of rows as MemRow[]) {
          if (r.id) byId.set(r.id, r);
        }
      }
    }

    const { data: recent } = await supabase
      .from("agent_memories")
      .select("id, content, memory_category, importance_score, created_at")
      .eq("agent_id", agent_id)
      .eq("user_id", user_id)
      .eq("is_active", true)
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(limit);

    if (recent?.length) {
      for (const r of recent as MemRow[]) {
        if (r.id && !byId.has(r.id)) byId.set(r.id, r);
      }
    }

    const combined = Array.from(byId.values()).slice(0, limit);
    const memoryIds = combined.map((m) => m.id);
    if (memoryIds.length > 0) {
      await supabase.rpc("increment_memory_access", { memory_ids: memoryIds });
    }

    const formatted = combined.map(
      (m) => `[${m.memory_category || "memory"}] ${m.content}`
    );

    return new Response(
      JSON.stringify({ memories: formatted, raw: combined }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (e) {
    console.error("retrieve-agent-memories error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

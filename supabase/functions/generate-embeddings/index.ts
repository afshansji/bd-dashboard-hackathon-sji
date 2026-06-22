import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { text, texts } = body as { text?: string; texts?: string[] };
    const input = text ? [text] : Array.isArray(texts) ? texts : [];
    if (input.length === 0) {
      return new Response(
        JSON.stringify({ error: "Provide 'text' or 'texts' array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const apiKey = LOVABLE_API_KEY || OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY or OPENAI_API_KEY required for embeddings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = LOVABLE_API_KEY
      ? "https://ai.gateway.lovable.dev/v1/embeddings"
      : "https://api.openai.com/v1/embeddings";

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input, model: "text-embedding-3-small" }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Embeddings API error:", res.status, err);
      return new Response(
        JSON.stringify({ error: "Embeddings request failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    const embeddings = (data.data as { embedding: number[] }[]).map((d) => d.embedding);
    return new Response(
      JSON.stringify({ embeddings: input.length === 1 ? embeddings[0] : embeddings }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (e) {
    console.error("generate-embeddings error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

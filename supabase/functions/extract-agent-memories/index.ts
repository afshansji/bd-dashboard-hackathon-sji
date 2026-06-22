import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const EXTRACTION_PROMPT = `You are a memory extractor. Given a conversation between a user and an AI assistant, extract memorable facts, preferences, decisions, and patterns about the user. Return a JSON array of objects. Each object must have:
- "memory_type": one of "summary", "fact", "preference", "decision", "pattern"
- "content": 1-2 sentence description
- "relevance_score": number between 0.5 and 1.0

Return only the JSON array, no other text. Example: [{"memory_type":"preference","content":"User prefers bullet-point summaries.","relevance_score":0.9}]`;

type ExtractedMemory = { memory_type: string; content: string; relevance_score: number };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { conversation_id, agent_id, user_id, latest_assistant_message } = (await req.json()) as {
      conversation_id: string;
      agent_id: string;
      user_id: string;
      latest_assistant_message?: string;
    };
    if (!conversation_id || !agent_id || !user_id) {
      return new Response(
        JSON.stringify({ error: "conversation_id, agent_id, user_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: messages, error: msgErr } = await supabase
      .from("agent_messages")
      .select("role, content")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true });

    if (msgErr) {
      return new Response(
        JSON.stringify({ error: "Failed to load messages", extracted: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    let conversationText = (messages || [])
      .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
      .join("\n");
    if (latest_assistant_message && typeof latest_assistant_message === "string") {
      conversationText = conversationText
        ? `${conversationText}\nassistant: ${latest_assistant_message}`
        : `assistant: ${latest_assistant_message}`;
    }

    console.log("extract-agent-memories: conversation built", {
      agent_id,
      user_id,
      conversation_id,
      has_latest_assistant: !!latest_assistant_message,
      db_message_count: (messages || []).length,
      text_length: conversationText.length,
    });

    if (!conversationText.trim()) {
      console.log("extract-agent-memories: empty conversation, skipping");
      return new Response(
        JSON.stringify({ error: "No conversation content", extracted: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const apiKey = LOVABLE_API_KEY || OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "No API key for extraction", extracted: 0 }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const chatUrl = LOVABLE_API_KEY
      ? "https://ai.gateway.lovable.dev/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";
    const model = LOVABLE_API_KEY ? "google/gemini-3-flash-preview" : "gpt-4o-mini";

    const chatRes = await fetch(chatUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: EXTRACTION_PROMPT },
          { role: "user", content: `Conversation:\n${conversationText.slice(-8000)}` },
        ],
        temperature: 0.3,
      }),
    });

    if (!chatRes.ok) {
      console.error("Extraction chat error:", await chatRes.text());
      return new Response(
        JSON.stringify({ error: "Extraction failed", extracted: 0 }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const chatData = await chatRes.json();
    const rawContent = chatData.choices?.[0]?.message?.content?.trim() ?? "[]";
    let items: ExtractedMemory[] = [];
    const cleaned = rawContent.replace(/```json\s*/gi, "").replace(/```\s*$/g, "").trim();
    try {
      const parsed = JSON.parse(cleaned);
      items = Array.isArray(parsed) ? parsed : [];
    } catch {
      const match = rawContent.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          items = JSON.parse(match[0]);
        } catch {
          // ignore
        }
      }
    }

    console.log("extract-agent-memories: AI returned", {
      raw_length: rawContent.length,
      items_parsed: items.length,
      items_preview: items.slice(0, 2).map((i) => i.content?.slice(0, 80)),
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    let stored = 0;

    for (const item of items) {
      if (!item.content || typeof item.content !== "string") continue;
      const category = (item.memory_type || "fact").toLowerCase();
      const validCategory = ["fact", "preference", "summary", "decision", "pattern"].includes(category)
        ? category
        : "fact";
      const importance = Math.min(1, Math.max(0, Number(item.relevance_score) || 0.5));

      let embedding: number[] | null = null;
      try {
        const embedRes = await fetch(`${supabaseUrl}/functions/v1/generate-embeddings`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
          body: JSON.stringify({ text: item.content }),
        });
        if (embedRes.ok) {
          const { embeddings } = await embedRes.json();
          embedding = Array.isArray(embeddings) ? embeddings : null;
        }
      } catch {
        // skip embedding
      }

      const { error: insertErr } = await supabase.from("agent_memories").insert({
        agent_id,
        user_id,
        memory_type: "short_term",
        memory_category: validCategory,
        content: item.content.slice(0, 2000),
        summary: item.content.slice(0, 200),
        embedding,
        source_type: "conversation",
        source_id: conversation_id,
        importance_score: importance,
      });
      if (insertErr) {
        console.error("agent_memories insert error:", insertErr.message, insertErr.code);
      } else {
        stored++;
      }
    }

    console.log("extract-agent-memories: done", { extracted: items.length, stored });

    return new Response(
      JSON.stringify({ extracted: items.length, stored }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (e) {
    console.error("extract-agent-memories error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

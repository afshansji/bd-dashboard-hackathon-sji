import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const agent_id = body.agent_id ?? body.agentId;
    const user_id = body.user_id ?? body.userId;
    const conversation_id = body.conversation_id ?? body.conversationId;
    const message = (body.message ?? body.input ?? body.content ?? "").trim() || "Hello";

    if (!agent_id) {
      return new Response(
        JSON.stringify({ error: "agent_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!LOVABLE_API_KEY && !OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "No AI API key configured. Set LOVABLE_API_KEY or OPENAI_API_KEY in Edge Function secrets.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: agent, error: agentErr } = await supabase
      .from("ai_agents")
      .select("id, name, system_prompt, memory_enabled, provider_config")
      .eq("id", agent_id)
      .single();

    if (agentErr || !agent) {
      return new Response(
        JSON.stringify({ error: "Agent not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let additionalPrompt = "";
    if (user_id) {
      try {
        const { data: p } = await supabase
          .from("user_agent_personalizations")
          .select("additional_prompt")
          .eq("user_id", user_id)
          .eq("agent_id", agent.id)
          .eq("is_enabled", true)
          .single();
        additionalPrompt = p?.additional_prompt || "";
      } catch {
        // skip
      }
    }

    let memoryContext = "";
    if (agent.memory_enabled && user_id) {
      try {
        const memRes = await fetch(`${supabaseUrl}/functions/v1/retrieve-agent-memories`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
          body: JSON.stringify({ agent_id, user_id, message, limit: 5 }),
        });
        if (memRes.ok) {
          const { memories } = await memRes.json();
          if (Array.isArray(memories) && memories.length > 0) {
            memoryContext =
              "\n\nRELEVANT CONTEXT FROM PREVIOUS CONVERSATIONS:\n" + memories.join("\n");
          }
        }
      } catch {
        // continue without memory
      }
    }

    const systemContent =
      (agent.system_prompt || "You are a helpful AI assistant.") +
      (additionalPrompt ? `\n\n${additionalPrompt}` : "") +
      memoryContext;

    const chatMessages: Array<{ role: string; content: string }> = [{ role: "system", content: systemContent }];

    if (conversation_id) {
      const { data: history } = await supabase
        .from("agent_messages")
        .select("role, content")
        .eq("conversation_id", conversation_id)
        .order("created_at", { ascending: true })
        .limit(20);
      if (history?.length) {
        for (const m of history) {
          if (m.role === "user" || m.role === "assistant") {
            chatMessages.push({ role: m.role, content: m.content });
          }
        }
      }
    }

    chatMessages.push({ role: "user", content: message });

    const startTime = Date.now();
    const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

    if (LOVABLE_API_KEY) {
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: chatMessages,
          temperature: 0.7,
        }),
      });
      if (!aiRes.ok) {
        const errText = await aiRes.text();
        console.error("Lovable chat error:", aiRes.status, errText);
        return new Response(
          JSON.stringify({ error: "AI gateway error" }),
          { status: 500, headers: jsonHeaders }
        );
      }
      const data = await aiRes.json();
      const output = data.choices?.[0]?.message?.content || "No response generated.";
      const latencyMs = Date.now() - startTime;

      console.log("Memory extraction check (lovable):", {
        memory_enabled: agent.memory_enabled,
        has_conversation_id: !!conversation_id,
        has_user_id: !!user_id,
        will_extract: !!(agent.memory_enabled && conversation_id && user_id),
      });

      if (agent.memory_enabled && conversation_id && user_id) {
        try {
          const extractRes = await fetch(`${supabaseUrl}/functions/v1/extract-agent-memories`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
            body: JSON.stringify({
              conversation_id,
              agent_id,
              user_id,
              latest_assistant_message: output,
            }),
          });
          const extractBody = await extractRes.json();
          console.log("Extract result (lovable):", extractRes.status, extractBody);
        } catch (extractErr) {
          console.error("Extract call failed (lovable):", extractErr);
        }
      }

      return new Response(
        JSON.stringify({
          output,
          token_usage: data.usage || {},
          latency_ms: latencyMs,
          model_used: "google/gemini-3-flash-preview",
          provider_used: "lovable",
        }),
        { headers: jsonHeaders, status: 200 }
      );
    }

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: chatMessages,
        temperature: 0.7,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("OpenAI error:", openaiRes.status, errText);
      let errMsg = "OpenAI API error";
      try {
        const j = JSON.parse(errText);
        if (j?.error?.message) errMsg = j.error.message;
      } catch {
        // ignore
      }
      return new Response(
        JSON.stringify({ error: errMsg }),
        { status: openaiRes.status >= 400 && openaiRes.status < 600 ? openaiRes.status : 500, headers: jsonHeaders }
      );
    }

    const openaiData = await openaiRes.json();
    const output = openaiData.choices?.[0]?.message?.content || "No response generated.";
    const latencyMs = Date.now() - startTime;

    console.log("Memory extraction check (openai):", {
      memory_enabled: agent.memory_enabled,
      has_conversation_id: !!conversation_id,
      has_user_id: !!user_id,
      will_extract: !!(agent.memory_enabled && conversation_id && user_id),
    });

    if (agent.memory_enabled && conversation_id && user_id) {
      try {
        const extractRes = await fetch(`${supabaseUrl}/functions/v1/extract-agent-memories`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
          body: JSON.stringify({
            conversation_id,
            agent_id,
            user_id,
            latest_assistant_message: output,
          }),
        });
        const extractBody = await extractRes.json();
        console.log("Extract result (openai):", extractRes.status, extractBody);
      } catch (extractErr) {
        console.error("Extract call failed (openai):", extractErr);
      }
    }

    return new Response(
      JSON.stringify({
        output,
        token_usage: openaiData.usage || {},
        latency_ms: latencyMs,
        model_used: openaiData.model || "gpt-4o-mini",
        provider_used: "openai",
      }),
      { headers: jsonHeaders, status: 200 }
    );
  } catch (e) {
    console.error("agent-conversation-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agent_id, input, user_id, conversation_id } = await req.json();

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

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch agent config
    const { data: agent, error: agentErr } = await supabaseClient
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

    // Load user personalization
    let additionalPrompt = "";
    if (user_id) {
      try {
        const { data: personalization } = await supabaseClient
          .from("user_agent_personalizations")
          .select("additional_prompt")
          .eq("user_id", user_id)
          .eq("agent_id", agent.id)
          .eq("is_enabled", true)
          .single();
        additionalPrompt = personalization?.additional_prompt || "";
      } catch {
        // safe to skip
      }
    }

    // Build messages array
    const messages: Array<{ role: string; content: string }> = [
      {
        role: "system",
        content: (agent.system_prompt || "You are a helpful AI assistant.") +
          (additionalPrompt ? `\n\n${additionalPrompt}` : ""),
      },
    ];

    // Inject conversation history if memory is enabled
    if (agent.memory_enabled && conversation_id) {
      try {
        const { data: history } = await supabaseClient
          .from("agent_messages")
          .select("role, content")
          .eq("conversation_id", conversation_id)
          .order("created_at", { ascending: true })
          .limit(20); // Last 20 messages for context

        if (history && history.length > 0) {
          for (const msg of history) {
            messages.push({ role: msg.role, content: msg.content });
          }
        }
      } catch {
        // safe to skip
      }
    }

    // Add current user message
    messages.push({ role: "user", content: input || "Hello" });

    const startTime = Date.now();
    const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

    if (LOVABLE_API_KEY) {
      const aiResponse = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages,
            temperature: 0.7,
          }),
        }
      );

      if (!aiResponse.ok) {
        const status = aiResponse.status;
        if (status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
            { status: 429, headers: jsonHeaders }
          );
        }
        if (status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
            { status: 402, headers: jsonHeaders }
          );
        }
        const errorText = await aiResponse.text();
        console.error("AI gateway error:", status, errorText);
        return new Response(
          JSON.stringify({ error: "AI gateway error" }),
          { status: 500, headers: jsonHeaders }
        );
      }

      const data = await aiResponse.json();
      const output = data.choices?.[0]?.message?.content || "No response generated.";
      const latencyMs = Date.now() - startTime;
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

    // Fallback: OpenAI API
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const status = openaiResponse.status;
      const errorText = await openaiResponse.text();
      console.error("OpenAI error:", status, errorText);
      let errMsg = "OpenAI API error";
      try {
        const errJson = JSON.parse(errorText);
        if (errJson?.error?.message) errMsg = errJson.error.message;
      } catch {
        // ignore
      }
      return new Response(
        JSON.stringify({ error: errMsg }),
        { status: status >= 400 && status < 600 ? status : 500, headers: jsonHeaders }
      );
    }

    const openaiData = await openaiResponse.json();
    const output =
      openaiData.choices?.[0]?.message?.content || "No response generated.";
    const latencyMs = Date.now() - startTime;
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("ai-agent-chat error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

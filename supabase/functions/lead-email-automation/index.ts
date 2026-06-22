import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders } from "../_shared/cors.ts";

interface EmailPayload {
  subject: string;
  sender?: string;
  body: string;
  message_id?: string;
  thread_id?: string;
}

interface ParsedLeadPayload {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  notes?: string;
  confidence?: number;
  status?: string;
}

type LeadAutomationResponse = {
  status: string;
  client_id: string | null;
  confidence: number | null;
  hubspot_status: string | null;
  ghl_status: string | null;
};

const headers = { ...corsHeaders, "Content-Type": "application/json" };

async function createSupabaseClient(): Promise<SupabaseClient> {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceKey) {
    throw new Error("Supabase environment variables are not configured");
  }

  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

async function callRunAiAgent(payload: EmailPayload): Promise<ParsedLeadPayload | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const agentId = Deno.env.get("LEAD_EMAIL_AGENT_ID");
  const agentUserId = Deno.env.get("LEAD_EMAIL_AGENT_USER_ID");

  if (supabaseUrl && serviceKey && agentId && agentUserId) {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/run-ai-agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
        body: JSON.stringify({
          agent_id: agentId,
          execution_context: {
            user_id: agentUserId,
            email_subject: payload.subject,
            email_sender: payload.sender ?? "",
            email_body: payload.body,
            instruction: "Extract lead contact details from the provided email body.",
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const firstAction = Array.isArray(data?.action_items) ? data.action_items[0] : null;
        const structured = typeof firstAction?.description === "string" ? firstAction.description : data?.summary;
        if (structured) {
          try {
            const jsonMatch = structured.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              return normalizeParsedPayload(parsed);
            }
          } catch (_error) {
            // Fall back to OpenAI parsing below
          }
        }
      }
    } catch (error) {
      console.error("[lead-email-automation] run-ai-agent invocation failed", error);
    }
  }

  return await callOpenAIParser(payload);
}

function normalizeParsedPayload(raw: Record<string, unknown>): ParsedLeadPayload {
  const confidence = raw.confidence;
  return {
    name: typeof raw.name === "string" ? raw.name : undefined,
    company: typeof raw.company === "string" ? raw.company : undefined,
    email: typeof raw.email === "string" ? raw.email : undefined,
    phone: typeof raw.phone === "string" ? raw.phone : undefined,
    notes: typeof raw.notes === "string" ? raw.notes : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
    confidence: typeof confidence === "number"
      ? confidence
      : typeof confidence === "string"
        ? Number.parseFloat(confidence)
        : undefined,
  };
}

async function callOpenAIParser(payload: EmailPayload): Promise<ParsedLeadPayload | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    console.warn("[lead-email-automation] OPENAI_API_KEY is not set");
    return null;
  }

  const model = Deno.env.get("LEAD_EMAIL_MODEL") ?? "gpt-4.1-mini";
  const prompt = `Extract the following fields from this email: name, company, email, phone, notes.\nOutput valid JSON with keys: {"name": string | null, "company": string | null, "email": string | null, "phone": string | null, "notes": string | null, "confidence": number}.\nIf confidence < 80, include "status": "needs_review".\nEmail Subject: ${payload.subject}\nSender: ${payload.sender ?? "Unknown"}\nBody:\n${payload.body}`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: prompt,
      max_output_tokens: 600,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${text}`);
  }

  const data = await response.json();
  const content = data?.output?.[0]?.content?.[0]?.text ?? data?.output_text ?? data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("OpenAI response did not include text content");
  }

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Unable to parse OpenAI response as JSON");
  }

  return normalizeParsedPayload(JSON.parse(jsonMatch[0]));
}

function extractEmailAddress(raw?: string): string | null {
  if (!raw) return null;
  const match = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0].toLowerCase() : raw.toLowerCase();
}

function extractDomain(email?: string | null): string | null {
  if (!email) return null;
  const parts = email.split("@");
  return parts.length === 2 ? parts[1].toLowerCase() : null;
}

async function findClientMatch(client: SupabaseClient, parsed: ParsedLeadPayload, senderEmail: string | null) {
  const candidateEmail = parsed.email ?? senderEmail;
  if (candidateEmail) {
    const { data: directMatch } = await client
      .from("clients")
      .select("id, name, email")
      .ilike("email", candidateEmail);

    if (directMatch && directMatch.length > 0) {
      return directMatch[0];
    }

    const { data: contactMatch } = await client
      .from("contacts")
      .select("client_id, email")
      .ilike("email", candidateEmail)
      .maybeSingle();

    if (contactMatch?.client_id) {
      const { data: clientRow } = await client
        .from("clients")
        .select("id, name, email")
        .eq("id", contactMatch.client_id)
        .maybeSingle();
      if (clientRow) return clientRow;
    }
  }

  const domain = extractDomain(candidateEmail ?? senderEmail ?? undefined);
  if (domain) {
    const { data: domainMatches } = await client
      .from("clients")
      .select("id, name, email, website")
      .or(`email.ilike.%@${domain},website.ilike.%${domain}%`)
      .limit(1);

    if (domainMatches && domainMatches.length > 0) {
      return domainMatches[0];
    }
  }

  return null;
}

async function createReviewTask(client: SupabaseClient, payload: EmailPayload, parsed: ParsedLeadPayload | null) {
  const description = parsed?.notes ?? payload.body.slice(0, 2000);
  await client.from("tasks").insert({
    title: `Review Lead: ${payload.subject || "Untitled"}`,
    description,
    status: "pending_review",
    priority: "medium",
  });
}

async function createDeal(client: SupabaseClient, clientId: string, payload: EmailPayload, parsed: ParsedLeadPayload | null) {
  const confidence = parsed?.confidence ?? null;
  const probability = confidence !== null ? Math.round(Math.max(0, Math.min(100, confidence))) : null;
  const titleParts = [payload.subject || null, parsed?.company || null, parsed?.name || null].filter(Boolean);
  const title = titleParts[0] ?? `New Lead - ${parsed?.name ?? "Unknown"}`;

  const { error } = await client.from("deals").insert({
    client_id: clientId,
    title,
    probability,
    stage: "new_lead",
    synced_from_control_tower: false,
  });

  if (error) throw error;
}

async function callEdgeFunction(path: string, body?: Record<string, unknown>): Promise<string> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase environment variables are not configured");
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[lead-email-automation] ${path} failed`, response.status, text);
    return `error:${response.status}`;
  }

  try {
    const json = await response.json();
    if (json && typeof json === "object") {
      if (typeof json.status === "string") return json.status;
      if (json.ok === true) return "ok";
    }
    return "ok";
  } catch (_err) {
    return "ok";
  }
}

async function logAutomation(client: SupabaseClient, log: {
  email_message_id?: string;
  client_id?: string | null;
  hubspot_status?: string | null;
  ghl_status?: string | null;
  ai_confidence?: number | null;
  status?: string;
  parsed_data?: ParsedLeadPayload | null;
  raw_subject?: string;
  raw_body?: string;
  raw_sender?: string | null;
}) {
  await client.from("lead_automation_logs").insert({
    email_message_id: log.email_message_id ?? null,
    client_id: log.client_id ?? null,
    hubspot_status: log.hubspot_status ?? null,
    ghl_status: log.ghl_status ?? null,
    ai_confidence: log.ai_confidence ?? null,
    status: log.status ?? null,
    parsed_data: log.parsed_data ? log.parsed_data as unknown as Record<string, unknown> : null,
    raw_subject: log.raw_subject ?? null,
    raw_body: log.raw_body ?? null,
    raw_sender: log.raw_sender ?? null,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers });
  }

  let payload: EmailPayload;
  try {
    payload = await req.json();
  } catch (_error) {
    return new Response(JSON.stringify({ error: "Invalid JSON payload" }), { status: 400, headers });
  }

  if (!payload?.body) {
    return new Response(JSON.stringify({ error: "Email body is required" }), { status: 400, headers });
  }

  const supabase = await createSupabaseClient();

  try {
    const parsed = await callRunAiAgent(payload);
    const senderEmail = extractEmailAddress(payload.sender ?? parsed?.email ?? undefined);
    const clientMatch = parsed ? await findClientMatch(supabase, parsed, senderEmail) : null;

    let hubspotStatus: string | null = null;
    let ghlStatus: string | null = null;
    let status = "processed";
    let clientId: string | null = clientMatch?.id ?? null;

    if (clientMatch?.id) {
      await createDeal(supabase, clientMatch.id, payload, parsed);
      clientId = clientMatch.id;
      status = "matched";

      hubspotStatus = await callEdgeFunction("hubspot-sync/sync");
      ghlStatus = await callEdgeFunction("gohighlevel-manage/sync-contacts");
    } else {
      status = parsed?.status ?? (parsed?.confidence && parsed.confidence < 80 ? "needs_review" : "needs_review");
      await createReviewTask(supabase, payload, parsed);
    }

    await logAutomation(supabase, {
      email_message_id: payload.message_id,
      client_id: clientId,
      hubspot_status: hubspotStatus,
      ghl_status: ghlStatus,
      ai_confidence: parsed?.confidence ?? null,
      status,
      parsed_data: parsed,
      raw_subject: payload.subject,
      raw_body: payload.body,
      raw_sender: payload.sender ?? senderEmail,
    });

    const response: LeadAutomationResponse = {
      status,
      client_id: clientId,
      confidence: parsed?.confidence ?? null,
      hubspot_status: hubspotStatus,
      ghl_status: ghlStatus,
    };

    return new Response(JSON.stringify(response), { status: 200, headers });
  } catch (error) {
    console.error("[lead-email-automation]", error);

    await logAutomation(supabase, {
      email_message_id: payload.message_id,
      hubspot_status: null,
      ghl_status: null,
      ai_confidence: null,
      status: "error",
      parsed_data: null,
      raw_subject: payload.subject,
      raw_body: payload.body,
      raw_sender: payload.sender ?? null,
    });

    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers,
    });
  }
});

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders } from "../_shared/cors.ts";

type ActionPayload =
  | { action: "get_config" }
  | { action: "update_config"; enable_cron: boolean; sync_interval_minutes: number }
  | { action: "run_now" }
  | { action: "retry_failed" }
  | Record<string, never>;

interface AutomationConfig {
  enable_cron: boolean;
  sync_interval_minutes: number;
  source: "settings" | "env";
}

interface GmailMessageList {
  messages?: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
}

interface GmailMessage {
  id: string;
  threadId: string;
  payload?: {
    mimeType?: string;
    headers?: Array<{ name?: string; value?: string }>;
    body?: { data?: string };
    parts?: GmailMessage["payload"][];
  };
  snippet?: string;
}

const headers = { ...corsHeaders, "Content-Type": "application/json" };

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

async function createSupabaseClient(req?: Request): Promise<SupabaseClient> {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceKey) {
    throw new Error("Supabase environment variables are not configured");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
    global: req ? { headers: { Authorization: req.headers.get("Authorization") ?? "" } } : undefined,
  });
}

async function requireAuth(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    throw new HttpError(401, "Unauthorized");
  }
  return data.user.id;
}

async function getAutomationSettings(client: SupabaseClient): Promise<AutomationConfig> {
  const { data } = await client
    .from("lead_automation_settings")
    .select("enable_cron, sync_interval_minutes")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const enableCronEnv = (Deno.env.get("ENABLE_CRON") ?? "true").toLowerCase();
  const syncIntervalEnv = Number.parseInt(Deno.env.get("SYNC_INTERVAL") ?? "60", 10);

  if (data) {
    return {
      enable_cron: data.enable_cron ?? enableCronEnv === "true",
      sync_interval_minutes: data.sync_interval_minutes ?? syncIntervalEnv,
      source: "settings",
    };
  }

  return {
    enable_cron: enableCronEnv === "true",
    sync_interval_minutes: Number.isFinite(syncIntervalEnv) ? syncIntervalEnv : 60,
    source: "env",
  };
}

async function updateAutomationSettings(client: SupabaseClient, userId: string, payload: { enable_cron: boolean; sync_interval_minutes: number }) {
  await client.from("lead_automation_settings").upsert({
    enable_cron: payload.enable_cron,
    sync_interval_minutes: payload.sync_interval_minutes,
    updated_by: userId,
  });
}

function decodeBase64Url(data?: string): string {
  if (!data) return "";
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  try {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch (_err) {
    return Array.from(bytes)
      .map((byte) => String.fromCharCode(byte))
      .join("");
  }
}

function extractHeader(message: GmailMessage, name: string): string | null {
  const header = message.payload?.headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase());
  return header?.value ?? null;
}

function extractBody(message: GmailMessage): string {
  if (message.payload?.body?.data) {
    return decodeBase64Url(message.payload.body.data);
  }

  const parts = message.payload?.parts ?? [];
  for (const part of parts) {
    if (part?.mimeType === "text/plain" && part.body?.data) {
      return decodeBase64Url(part.body.data);
    }
  }

  if (parts.length > 0) {
    const fallback = parts[0]?.body?.data;
    if (fallback) return decodeBase64Url(fallback);
  }

  return message.snippet ?? "";
}

async function getGmailAccessToken(): Promise<string> {
  const clientEmail = Deno.env.get("GMAIL_CLIENT_EMAIL");
  const privateKey = Deno.env.get("GMAIL_PRIVATE_KEY");
  const impersonatedUser = Deno.env.get("GMAIL_IMPERSONATED_USER") ?? "business@sjinnovation.com";

  if (!clientEmail || !privateKey) {
    throw new Error("Gmail service account credentials are not configured");
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/gmail.modify",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
    sub: impersonatedUser,
  };

  const encoder = new TextEncoder();
  const header = { alg: "RS256", typ: "JWT" };
  const base64Header = btoa(JSON.stringify(header));
  const base64Payload = btoa(JSON.stringify(payload));
  const unsignedToken = `${base64Header}.${base64Payload}`;

  const keyData = privateKey.replace(/-----BEGIN PRIVATE KEY-----/g, "").replace(/-----END PRIVATE KEY-----/g, "").replace(/\s+/g, "");
  const keyBuffer = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0)).buffer;

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, encoder.encode(unsignedToken));
  const signedToken = `${unsignedToken}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: signedToken,
    }).toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to obtain Gmail access token (${response.status}): ${text}`);
  }

  const data = await response.json();
  if (!data?.access_token) {
    throw new Error("Gmail token response missing access_token");
  }

  return data.access_token as string;
}

async function listUnreadMessages(token: string): Promise<GmailMessage[]> {
  const user = Deno.env.get("GMAIL_IMPERSONATED_USER") ?? "business@sjinnovation.com";
  const messages: GmailMessage[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(user)}/messages`);
    url.searchParams.set("labelIds", "INBOX");
    url.searchParams.set("q", "is:unread");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to list Gmail messages (${response.status}): ${text}`);
    }

    const data = (await response.json()) as GmailMessageList;
    if (Array.isArray(data.messages)) {
      for (const msg of data.messages) {
        const message = await fetchMessage(token, msg.id);
        messages.push(message);
      }
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return messages;
}

async function fetchMessage(token: string, id: string): Promise<GmailMessage> {
  const user = Deno.env.get("GMAIL_IMPERSONATED_USER") ?? "business@sjinnovation.com";
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(user)}/messages/${id}?format=full`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch Gmail message ${id} (${response.status}): ${text}`);
  }

  return (await response.json()) as GmailMessage;
}

async function markMessageAsRead(token: string, id: string) {
  const user = Deno.env.get("GMAIL_IMPERSONATED_USER") ?? "business@sjinnovation.com";
  await fetch(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(user)}/messages/${id}/modify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
  });
}

async function triggerAutomation(payload: EmailPayload): Promise<Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase environment variables are not configured");
  }

  return await fetch(`${supabaseUrl}/functions/v1/lead-email-automation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
    body: JSON.stringify(payload),
  });
}

interface EmailPayload {
  subject: string;
  sender?: string | null;
  body: string;
  message_id?: string;
  thread_id?: string;
}

async function runCron(): Promise<{ processed: number; errors: string[] }> {
  const token = await getGmailAccessToken();
  const messages = await listUnreadMessages(token);
  const errors: string[] = [];
  let processed = 0;

  for (const message of messages) {
    try {
      const subject = extractHeader(message, "Subject") ?? "(no subject)";
      const sender = extractHeader(message, "From");
      const body = extractBody(message);

      const response = await triggerAutomation({
        subject,
        sender,
        body,
        message_id: message.id,
        thread_id: message.threadId,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Automation failed (${response.status}): ${text}`);
      }

      await markMessageAsRead(token, message.id);
      processed += 1;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return { processed, errors };
}

async function retryFailedRuns(client: SupabaseClient): Promise<{ retried: number; errors: string[] }> {
  const { data, error } = await client
    .from("lead_automation_logs")
    .select("id, raw_subject, raw_body, raw_sender, email_message_id")
    .in("status", ["needs_review", "error"])
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) throw error;

  const logs = data ?? [];
  const errors: string[] = [];
  let retried = 0;

  for (const log of logs) {
    if (!log.raw_body) {
      continue;
    }

    try {
      const response = await triggerAutomation({
        subject: log.raw_subject ?? "(no subject)",
        sender: log.raw_sender ?? undefined,
        body: log.raw_body,
        message_id: log.email_message_id ?? undefined,
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Automation retry failed (${response.status}): ${text}`);
      }
      retried += 1;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  return { retried, errors };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers });
  }

  let payload: ActionPayload = {};
  try {
    if (req.headers.get("content-length") !== "0") {
      payload = await req.json();
    }
  } catch (_err) {
    payload = {};
  }

  const supabase = await createSupabaseClient(req);
  const serviceClient = await createSupabaseClient();

  try {
    if (payload && typeof payload === "object" && "action" in payload) {
      switch (payload.action) {
        case "get_config": {
          await requireAuth(supabase);
          const config = await getAutomationSettings(serviceClient);
          return new Response(JSON.stringify(config), { status: 200, headers });
        }
        case "update_config": {
          const userId = await requireAuth(supabase);
          const minutes = Math.max(5, Math.min(240, Number(payload.sync_interval_minutes)));
          await updateAutomationSettings(serviceClient, userId, {
            enable_cron: Boolean(payload.enable_cron),
            sync_interval_minutes: minutes,
          });
          const config = await getAutomationSettings(serviceClient);
          return new Response(JSON.stringify(config), { status: 200, headers });
        }
        case "run_now": {
          await requireAuth(supabase);
          const result = await runCron();
          return new Response(JSON.stringify({ ...result, triggered: "manual" }), { status: 200, headers });
        }
        case "retry_failed": {
          await requireAuth(supabase);
          const result = await retryFailedRuns(serviceClient);
          return new Response(JSON.stringify(result), { status: 200, headers });
        }
        default:
          break;
      }
    }

    const config = await getAutomationSettings(serviceClient);
    if (!config.enable_cron) {
      return new Response(JSON.stringify({ status: "disabled", processed: 0, errors: [] }), { status: 200, headers });
    }

    const result = await runCron();
    return new Response(JSON.stringify({ ...result, triggered: "scheduled" }), { status: 200, headers });
  } catch (error) {
    console.error("[lead-cron-sync]", error);
    if (error instanceof HttpError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status,
        headers,
      });
    }
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers,
    });
  }
});

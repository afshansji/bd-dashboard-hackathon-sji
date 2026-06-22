import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AnalyticsApiConsumer {
  id: string;
  name: string;
  description: string | null;
  api_secret_hash: string;
  webhook_url: string | null;
  webhook_secret: string | null;
  is_active: boolean;
  push_enabled: boolean;
  push_frequency: "daily" | "weekly" | "monthly" | "manual" | string;
  allowed_periods: string[];
  last_push_at: string | null;
  last_push_status: string | null;
  created_at: string;
  updated_at: string;
}

const encoder = new TextEncoder();

function getBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token && token.length > 0 ? token : null;
}

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function hashSecret(plain: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(plain));
  return toHex(digest);
}

export function generateApiSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return toBase64Url(bytes);
}

export async function validateApiSecret(
  req: Request,
  supabase: SupabaseClient,
): Promise<AnalyticsApiConsumer> {
  // Preferred: Authorization: Bearer <apiKey>
  const bearer = getBearerToken(req.headers.get("authorization"));
  // Backward-compatible fallback for existing consumers.
  const legacy = req.headers.get("x-api-secret");
  const secret = bearer ?? legacy;

  if (!secret) throw new Error("Missing API key");

  const apiSecretHash = await hashSecret(secret);

  const { data, error } = await supabase
    .from("analytics_api_consumers")
    .select("*")
    .eq("api_secret_hash", apiSecretHash)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to validate API secret: ${error.message}`);
  }

  if (!data) {
    throw new Error("Invalid API key");
  }

  return data as AnalyticsApiConsumer;
}


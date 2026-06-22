import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { aggregateUserAnalytics, type AnalyticsPeriod } from "../_shared/analyticsAggregator.ts";

type PushFrequency = "daily" | "weekly" | "monthly" | "manual" | string;

interface ConsumerRow {
  id: string;
  name: string;
  webhook_url: string | null;
  webhook_secret: string | null;
  is_active: boolean;
  push_enabled: boolean;
  push_frequency: PushFrequency;
  last_push_at: string | null;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function computeDateRange(period: AnalyticsPeriod, end: Date) {
  const endMs = end.getTime();
  let startMs = endMs;
  switch (period) {
    case "daily":
      startMs = endMs - 24 * 60 * 60 * 1000;
      break;
    case "weekly":
      startMs = endMs - 7 * 24 * 60 * 60 * 1000;
      break;
    case "monthly":
      startMs = endMs - 30 * 24 * 60 * 60 * 1000;
      break;
    case "all":
      startMs = endMs - 90 * 24 * 60 * 60 * 1000;
      break;
  }
  return { periodStart: new Date(startMs), periodEnd: end };
}

function frequencyToPeriod(freq: PushFrequency): AnalyticsPeriod {
  if (freq === "daily") return "daily";
  if (freq === "weekly") return "weekly";
  if (freq === "monthly") return "monthly";
  // 'manual' (or anything else) defaults to monthly for safety/consistency
  return "monthly";
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function postWithRetry(
  url: string,
  payload: unknown,
  webhookSecret: string,
  maxAttempts = 3,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let lastError = "Unknown error";

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-secret": webhookSecret,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        console.log(`[push-analytics] POST ok url=${url} attempt=${attempt} ms=${Date.now() - startedAt}`);
        return { ok: true };
      }

      const text = await res.text().catch(() => "");
      lastError = `HTTP ${res.status}${text ? `: ${text}` : ""}`;
      console.warn(`[push-analytics] POST failed url=${url} attempt=${attempt} err=${lastError}`);
    } catch (err) {
      clearTimeout(timeout);
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(`[push-analytics] POST error url=${url} attempt=${attempt} err=${lastError}`);
    }

    if (attempt < maxAttempts) {
      const backoffMs = Math.pow(2, attempt - 1) * 1000;
      await sleep(backoffMs);
    }
  }

  return { ok: false, error: lastError };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const consumerId = typeof body?.consumer_id === "string" ? body.consumer_id : null;

    let query = supabase
      .from("analytics_api_consumers")
      .select("id, name, webhook_url, webhook_secret, is_active, push_enabled, push_frequency, last_push_at")
      .eq("is_active", true)
      .eq("push_enabled", true);

    if (consumerId) {
      query = query.eq("id", consumerId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const consumers = (data || []) as ConsumerRow[];
    if (consumers.length === 0) {
      return jsonResponse({ pushed: 0, results: [] });
    }

    const now = new Date();
    const results: Array<{ id: string; name: string; status: "success" | "failed" | "skipped"; error?: string }> = [];

    for (const consumer of consumers) {
      const start = Date.now();
      try {
        // Basic cooldown to reduce abuse if this endpoint is invoked repeatedly.
        if (!consumerId && consumer.last_push_at) {
          const last = new Date(consumer.last_push_at).getTime();
          if (Number.isFinite(last) && now.getTime() - last < 5 * 60 * 1000) {
            results.push({ id: consumer.id, name: consumer.name, status: "skipped" });
            continue;
          }
        }

        if (!consumer.webhook_url) {
          throw new Error("Missing webhook_url");
        }
        if (!consumer.webhook_secret) {
          throw new Error("Missing webhook_secret");
        }

        const period = frequencyToPeriod(consumer.push_frequency);
        const { periodStart, periodEnd } = computeDateRange(period, now);

        const payload = await aggregateUserAnalytics(supabase, {
          period,
          periodStart,
          periodEnd,
        });

        const delivery = await postWithRetry(consumer.webhook_url, payload, consumer.webhook_secret, 3);

        if (!delivery.ok) {
          throw new Error(delivery.error);
        }

        const statusText = "success";
        await supabase
          .from("analytics_api_consumers")
          .update({ last_push_at: now.toISOString(), last_push_status: statusText })
          .eq("id", consumer.id);

        results.push({ id: consumer.id, name: consumer.name, status: "success" });
        console.log(`[push-analytics] consumer=${consumer.name} status=success ms=${Date.now() - start}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);

        await supabase
          .from("analytics_api_consumers")
          .update({ last_push_at: now.toISOString(), last_push_status: `failed: ${msg}` })
          .eq("id", consumer.id);

        results.push({ id: consumer.id, name: consumer.name, status: "failed", error: msg });
        console.warn(`[push-analytics] consumer=${consumer.name} status=failed ms=${Date.now() - start} err=${msg}`);
      }
    }

    const pushed = results.filter((r) => r.status === "success").length;
    return jsonResponse({ pushed, results });
  } catch (error) {
    console.error("[push-analytics] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return jsonResponse({ error: message }, 500);
  }
});


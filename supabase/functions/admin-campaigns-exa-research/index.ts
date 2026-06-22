import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

import { corsHeaders } from "../_shared/cors.ts";

const EXA_RESEARCH_URL = "https://api.exa.ai/research";
const MAX_EXA_RETRIES = 2;
const EXA_TIMEOUT_MS = 30_000;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ResearchPayloadSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters long."),
  regions: z.array(z.string().min(1)).optional().default([]),
  max_results: z
    .number()
    .int()
    .min(1, "At least one result is required.")
    .max(50, "A maximum of 50 results is supported.")
    .optional()
    .default(20),
});

type ResearchPayload = z.infer<typeof ResearchPayloadSchema>;

type ResearchJobStatus = "pending" | "completed" | "failed";

type ResearchJobDescriptor = {
  id: string;
  campaign_id: string;
  status: ResearchJobStatus;
  exa_research_id: string | null;
  request_context: Record<string, unknown>;
  report_json: unknown;
  error_details: Record<string, unknown> | null;
  attempts: number;
};

const buildJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const createServiceRoleClient = (req: Request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase service configuration is missing.");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    global: {
      headers: {
        Authorization: req.headers.get("Authorization") ?? "",
      },
    },
  });
};

const extractCampaignId = (url: URL) => {
  const segments = url.pathname.split("/").filter(Boolean);
  const fnIndex = segments.findIndex(
    (segment) => segment === "admin-campaigns-exa-research",
  );

  if (fnIndex >= 0 && segments.length > fnIndex + 1) {
    return segments[fnIndex + 1];
  }

  return (
    url.searchParams.get("campaign_id") ?? url.searchParams.get("campaignId")
  );
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const callExaResearch = async (
  payload: ResearchPayload,
  apiKey: string,
): Promise<{ data: unknown; attempts: number }> => {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_EXA_RETRIES + 1; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), EXA_TIMEOUT_MS);

    try {
      const response = await fetch(EXA_RESEARCH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Exa API responded with ${response.status}: ${errorText}`,
        );
      }

      const json = await response.json();
      return { data: json, attempts: attempt };
    } catch (error) {
      lastError = error;

      if (attempt > MAX_EXA_RETRIES) {
        const errorDetails = {
          message: error instanceof Error ? error.message : "Unknown Exa API error",
          name: error instanceof Error ? error.name : "ExaApiError",
          attempts: attempt,
          cause: error instanceof Error && "cause" in error 
            ? (error as Error).cause 
            : error,
          stack: error instanceof Error ? error.stack : undefined
        };
        
        throw errorDetails;
      }

      await sleep(500 * attempt);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  const fallbackError =
    lastError instanceof Error
      ? new Error(lastError.message)
      : new Error("Exa research request failed.");

  throw fallbackError;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return buildJsonResponse({ error: "Missing Authorization header." }, 401);
  }

  const url = new URL(req.url);
  const campaignId = extractCampaignId(url);

  if (!campaignId || !UUID_REGEX.test(campaignId)) {
    return buildJsonResponse(
      { error: "A valid campaign id must be supplied in the URL path." },
      400,
    );
  }

  if (req.method !== "POST") {
    return buildJsonResponse({ error: "Method not allowed." }, 405);
  }

  const requestBody = await req.json().catch(() => null);
  if (requestBody === null) {
    return buildJsonResponse({ error: "Invalid JSON body." }, 400);
  }

  const validation = ResearchPayloadSchema.safeParse(requestBody);
  if (!validation.success) {
    return buildJsonResponse(
      {
        error: "Invalid request payload.",
        details: validation.error.flatten(),
      },
      400,
    );
  }

  const payload = validation.data;
  const requestContext: Record<string, unknown> = {
    topic: payload.topic,
    regions: payload.regions,
    max_results: payload.max_results,
  };

  const exaApiKey = Deno.env.get("EXA_API_KEY");
  if (!exaApiKey) {
    return buildJsonResponse(
      { error: "EXA_API_KEY environment variable is not configured." },
      500,
    );
  }

  const supabase = createServiceRoleClient(req);

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id, metadata")
    .eq("id", campaignId)
    .maybeSingle();

  if (campaignError) {
    console.error("Failed to load campaign", campaignError);
    return buildJsonResponse(
      { error: "Unable to load campaign details." },
      500,
    );
  }

  if (!campaign) {
    return buildJsonResponse({ error: "Campaign not found." }, 404);
  }

  const { data: researchRow, error: insertError } = await supabase
    .from("campaign_research")
    .insert({
      campaign_id: campaignId,
      status: "pending",
      request_context: requestContext,
    })
    .select("id")
    .single();

  if (insertError || !researchRow) {
    console.error("Failed to create campaign research row", insertError);
    return buildJsonResponse(
      { error: "Unable to persist research job." },
      500,
    );
  }

  let finalStatus: ResearchJobStatus = "pending";
  let reportJson: unknown = null;
  let exaResearchId: string | null = null;
  let failureDetails: Record<string, unknown> | null = null;
  let attempts = 0;

  try {
    const result = await callExaResearch(payload, exaApiKey);
    reportJson = result.data;
    attempts = result.attempts;

    if (reportJson && typeof reportJson === "object") {
      const candidate = (reportJson as Record<string, unknown>).id ??
        (reportJson as Record<string, unknown>).research_id;
      exaResearchId = typeof candidate === "string" ? candidate : null;
    }

    const { error: updateResearchError } = await supabase
      .from("campaign_research")
      .update({
        status: "completed",
        report_json: reportJson,
        exa_research_id: exaResearchId,
        request_context: requestContext,
      })
      .eq("id", researchRow.id);

    if (updateResearchError) {
      throw new Error(
        `Failed to update research record: ${updateResearchError.message}`,
      );
    }

    const existingMetadata = (campaign.metadata ?? {}) as Record<string, unknown>;
    const updatedMetadata = {
      ...existingMetadata,
      research_report: reportJson,
    };

    const { error: updateCampaignError } = await supabase
      .from("campaigns")
      .update({ metadata: updatedMetadata })
      .eq("id", campaignId);

    if (updateCampaignError) {
      throw new Error(
        `Failed to update campaign metadata: ${updateCampaignError.message}`,
      );
    }

    finalStatus = "completed";
  } catch (error) {
    finalStatus = "failed";
    attempts = attempts || (error as { attempts?: number }).attempts || 1;

    const message =
      error instanceof Error ? error.message : "Unknown research failure.";

    failureDetails = {
      message,
      attempts,
      timestamp: new Date().toISOString(),
    };

    if (error instanceof Error && error.stack) {
      failureDetails.stack = error.stack;
    }

    if (
      error && typeof error === "object" && "cause" in error &&
      (error as { cause?: unknown }).cause
    ) {
      failureDetails.cause = (error as { cause?: unknown }).cause;
    }

    const { error: updateFailureError } = await supabase
      .from("campaign_research")
      .update({
        status: "failed",
        error_details: failureDetails,
      })
      .eq("id", researchRow.id);

    if (updateFailureError) {
      console.error("Failed to persist research failure", updateFailureError);
    }
  }

  const job: ResearchJobDescriptor = {
    id: researchRow.id,
    campaign_id: campaignId,
    status: finalStatus,
    exa_research_id: exaResearchId,
    request_context: requestContext,
    report_json: finalStatus === "completed" ? reportJson : null,
    error_details: failureDetails,
    attempts,
  };

  const statusCode = finalStatus === "completed" ? 200 : 202;

  return buildJsonResponse({ job }, statusCode);
});

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { encryptSecret, decryptSecret } from "../_shared/crypto.ts";

type GHLIntegrationRow = {
  id: string;
  user_id: string;
  api_key_encrypted: string;
  refresh_token_encrypted?: string | null;
  token_expires_at?: string | null;
  token_type?: string | null;
  location_id: string | null;
  location_name: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
};

type TriggerSource = "manual" | "webhook";

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const GHL_OAUTH_BASE = "https://marketplace.gohighlevel.com";

// Environment variable validation
function validateEnvironment(): { valid: boolean; missing: string[] } {
  const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "INTEGRATION_SECRET_KEY"];
  const missing = required.filter(key => !Deno.env.get(key));

  // OAuth credentials are optional but recommended for token refresh
  const oauthMissing: string[] = [];
  if (!Deno.env.get("GOHIGHLEVEL_CLIENT_ID")) oauthMissing.push("GOHIGHLEVEL_CLIENT_ID");
  if (!Deno.env.get("GOHIGHLEVEL_CLIENT_SECRET")) oauthMissing.push("GOHIGHLEVEL_CLIENT_SECRET");

  if (oauthMissing.length > 0) {
    console.warn("[GHL] OAuth credentials not configured. Token refresh will not work:", oauthMissing);
  }

  return { valid: missing.length === 0, missing };
}

async function refreshOAuthToken(
  client: SupabaseClient,
  integration: GHLIntegrationRow
): Promise<string | null> {
  try {
    if (!integration.refresh_token_encrypted) {
      console.log("[GHL] No refresh token available for integration", integration.id);
      return null;
    }

    const refreshToken = await decryptSecret(integration.refresh_token_encrypted);
    if (!refreshToken) {
      console.error("[GHL] Failed to decrypt refresh token");
      return null;
    }

    const clientId = Deno.env.get("GOHIGHLEVEL_CLIENT_ID");
    const clientSecret = Deno.env.get("GOHIGHLEVEL_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      console.error("[GHL] OAuth credentials not configured");
      return null;
    }

    console.log("[GHL] Attempting to refresh OAuth token for integration", integration.id);

    const response = await fetch(`${GHL_OAUTH_BASE}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GHL] OAuth refresh failed (${response.status}):`, errorText);
      return null;
    }

    const tokenData = await response.json();
    const newAccessToken = tokenData.access_token;
    const newRefreshToken = tokenData.refresh_token || refreshToken;
    const expiresIn = tokenData.expires_in || 86400;

    const encryptedAccessToken = await encryptSecret(newAccessToken);
    const encryptedRefreshToken = await encryptSecret(newRefreshToken);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    await client
      .from("gohighlevel_integrations")
      .update({
        api_key_encrypted: encryptedAccessToken,
        refresh_token_encrypted: encryptedRefreshToken,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", integration.id);

    console.log("[GHL] Successfully refreshed OAuth token for integration", integration.id);
    return newAccessToken;
  } catch (error) {
    console.error("[GHL] Error refreshing OAuth token:", error);
    return null;
  }
}

async function getValidAccessToken(
  client: SupabaseClient,
  integration: GHLIntegrationRow
): Promise<string | null> {
  const apiKey = await decryptSecret(integration.api_key_encrypted);
  if (!apiKey) return null;

  // If it's a private API key (not OAuth), return it directly
  if (integration.token_type === "private_api_key" || !integration.token_expires_at) {
    return apiKey;
  }

  // Check if OAuth token is expired or about to expire (within 5 minutes)
  const expiresAt = new Date(integration.token_expires_at);
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (expiresAt <= fiveMinutesFromNow) {
    console.log("[GHL] Access token expired or expiring soon, attempting refresh");
    const newToken = await refreshOAuthToken(client, integration);
    return newToken || apiKey; // Fallback to old token if refresh fails
  }

  return apiKey;
}

async function createSupabaseClient(req?: Request, forWebhook = false) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase environment variables are not configured");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
    global: !forWebhook && req
      ? { headers: { Authorization: req.headers.get("Authorization") ?? "" } }
      : undefined,
  });
}

async function requireAuth(client: SupabaseClient): Promise<string | null> {
  const { data } = await client.auth.getUser();
  return data.user?.id ?? null;
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return null;
  return numeric;
}

function parseDate(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
    return null;
  }
  if (typeof value === "string") {
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      const date = new Date(numeric);
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString().split("T")[0];
      }
    }
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
  }
  return null;
}

function splitName(fullName: string | null | undefined): { firstName: string; lastName: string } {
  if (!fullName || typeof fullName !== "string") {
    return { firstName: "", lastName: "" };
  }

  const nameParts = fullName.trim().split(/\s+/);
  if (nameParts.length === 0) {
    return { firstName: "", lastName: "" };
  } else if (nameParts.length === 1) {
    return { firstName: nameParts[0], lastName: "" };
  } else {
    // First part is firstName, rest is lastName
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ");
    return { firstName, lastName };
  }
}

async function resolvePrimaryBrand(client: SupabaseClient, userId: string | null): Promise<string | null> {
  if (userId) {
    const { data } = await client
      .from("user_brands")
      .select("brand_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1);
    if (data?.[0]?.brand_id) {
      return data[0].brand_id as string;
    }
  }

  const { data: brands } = await client
    .from("brands")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1);

  return brands?.[0]?.id ?? null;
}

async function fetchGHL(
  endpoint: string,
  apiKey: string,
  method: string = "GET",
  body?: any,
  client?: SupabaseClient,
  integration?: GHLIntegrationRow,
  retryCount: number = 0
) {
  const url = `${GHL_API_BASE}${endpoint}`;
  const maxRetries = 3;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Version: "2021-07-28",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // Handle rate limiting with exponential backoff
    if (response.status === 429 && retryCount < maxRetries) {
      const retryAfter = response.headers.get("Retry-After");
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, retryCount) * 1000;
      console.log(`[GHL] Rate limited on ${method} ${endpoint}, retrying after ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return fetchGHL(endpoint, apiKey, method, body, client, integration, retryCount + 1);
    }

    // If we get a 401 and have OAuth refresh capability, try refreshing the token
    if (response.status === 401 && client && integration && integration.refresh_token_encrypted && retryCount === 0) {
      console.log(`[GHL] Received 401 on ${method} ${endpoint}, attempting OAuth token refresh`);
      const newToken = await refreshOAuthToken(client, integration);

      if (newToken) {
        // Retry the request with the new token
        console.log(`[GHL] Retrying ${method} ${endpoint} with refreshed token`);
        return fetchGHL(endpoint, newToken, method, body, client, integration, retryCount + 1);
      }
    }

    if (!response.ok) {
      const text = await response.text();
      let userFriendlyMessage = "";

      // Provide user-friendly error messages based on status code
      if (response.status === 401 || response.status === 403) {
        userFriendlyMessage = "Authentication failed with Leadslift CRM. Please check your API credentials in the integration settings.";
      } else if (response.status === 404) {
        userFriendlyMessage = "The requested resource was not found in Leadslift CRM. The location or contact may have been deleted.";
      } else if (response.status === 429) {
        userFriendlyMessage = "Rate limit exceeded for Leadslift CRM API. Please try again in a few moments.";
      } else if (response.status >= 500) {
        userFriendlyMessage = "Leadslift CRM is experiencing technical difficulties. Please try again later.";
      } else {
        userFriendlyMessage = `Unable to sync with Leadslift CRM (Error ${response.status}). Please try again or contact support if the issue persists.`;
      }

      const errorMessage = `GoHighLevel API error on ${method} ${endpoint} (${response.status}): ${text}`;
      console.error(`[GHL] ${errorMessage}`);
      throw new Error(userFriendlyMessage);
    }

    return response.json();
  } catch (error) {
    // Handle network errors with retry
    if (retryCount < maxRetries && error instanceof Error &&
        (error.message.includes("fetch") || error.message.includes("network"))) {
      const waitTime = Math.pow(2, retryCount) * 1000;
      console.log(`[GHL] Network error on ${method} ${endpoint}, retrying after ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return fetchGHL(endpoint, apiKey, method, body, client, integration, retryCount + 1);
    }
    throw error;
  }
}

async function findPipelineAndStage(
  apiKey: string,
  locationId: string,
  pipelineName: string,
  stageName: string,
  client?: SupabaseClient,
  integration?: GHLIntegrationRow
): Promise<{ pipelineId: string; stageId: string } | null> {
  try {
    console.log(`[GHL] Searching for pipeline "${pipelineName}" and stage "${stageName}"`);

    // Fetch all pipelines for the location
    const pipelinesData = await fetchGHL(
      `/opportunities/pipelines?locationId=${locationId}`,
      apiKey,
      "GET",
      undefined,
      client,
      integration
    );

    const pipelines = Array.isArray(pipelinesData?.pipelines)
      ? pipelinesData.pipelines
      : (Array.isArray(pipelinesData) ? pipelinesData : []);

    // Find the target pipeline (case-insensitive)
    const targetPipeline = pipelines.find((p: any) =>
      p.name?.toLowerCase() === pipelineName.toLowerCase()
    );

    if (!targetPipeline) {
      console.error(`[GHL] Pipeline "${pipelineName}" not found. Available pipelines:`,
        pipelines.map((p: any) => p.name).join(", "));
      return null;
    }

    // Find the target stage within the pipeline (case-insensitive)
    const stages = Array.isArray(targetPipeline.stages) ? targetPipeline.stages : [];
    const targetStage = stages.find((s: any) =>
      s.name?.toLowerCase() === stageName.toLowerCase()
    );

    if (!targetStage) {
      console.error(`[GHL] Stage "${stageName}" not found in pipeline "${pipelineName}". Available stages:`,
        stages.map((s: any) => s.name).join(", "));
      return null;
    }

    console.log(`[GHL] Found pipeline "${targetPipeline.name}" (${targetPipeline.id}) and stage "${targetStage.name}" (${targetStage.id})`);

    return {
      pipelineId: targetPipeline.id,
      stageId: targetStage.id,
    };
  } catch (error) {
    console.error("[GHL] Error finding pipeline and stage:", error);
    return null;
  }
}

async function createOpportunity(
  apiKey: string,
  contactId: string,
  pipelineId: string,
  stageId: string,
  title: string,
  contactName?: string,
  client?: SupabaseClient,
  integration?: GHLIntegrationRow
): Promise<string | null> {
  try {
    console.log(`[GHL] Creating opportunity "${title}" for contact ${contactId}`);

    const opportunityData = {
      pipelineId,
      pipelineStageId: stageId,
      contactId,
      name: title,
      status: "open",
      source: "LeadsLift CRM",
    };

    const result = await fetchGHL(
      "/opportunities/",
      apiKey,
      "POST",
      opportunityData,
      client,
      integration
    );

    const opportunityId = result?.opportunity?.id || result?.id;

    if (opportunityId) {
      console.log(`[GHL] Successfully created opportunity ${opportunityId}`);
      return opportunityId;
    } else {
      console.error("[GHL] No opportunity ID returned from API");
      return null;
    }
  } catch (error) {
    console.error("[GHL] Error creating opportunity:", error);
    return null;
  }
}

async function syncGoHighLevel({
  client,
  integration,
  apiKey,
  triggeredBy,
}: {
  client: SupabaseClient;
  integration: GHLIntegrationRow;
  apiKey: string;
  triggeredBy: TriggerSource;
}) {
  const startTime = Date.now();
  const syncMetadata: Record<string, any> = {
    integration_id: integration.id,
    location_id: integration.location_id,
    location_name: integration.location_name,
    triggeredBy,
    started_at: new Date().toISOString(),
  };

  if (!integration.location_id) {
    throw new Error("Location ID is required for syncing GoHighLevel data");
  }

  try {

  const contactsPayload = await fetchGHL(
    `/contacts/search`,
    apiKey,
    "POST",
    { locationId: integration.location_id },
    client,
    integration
  );
  const contacts = Array.isArray(contactsPayload?.contacts) ? contactsPayload.contacts : (Array.isArray(contactsPayload) ? contactsPayload : []);

  const contactsToInsert = contacts.map((contact: any) => {
    const fullName = contact.name || [contact.firstName, contact.lastName].filter(Boolean).join(" ");
    const status = contact.status || (Array.isArray(contact.tags) ? contact.tags.join(",") : null);
    return {
      integration_id: integration.id,
      contact_id: contact.id,
      name: fullName || contact.companyName || "Unknown Contact",
      email: contact.email || null,
      phone: contact.phone || null,
      status,
    };
  });

  await client
    .from("gohighlevel_contacts")
    .delete()
    .eq("integration_id", integration.id);

  if (contactsToInsert.length > 0) {
    await client.from("gohighlevel_contacts").insert(contactsToInsert);
  }

  const emailMap = new Map<string, string>();
  const contactClientMap = new Map<string, string>();

  const emails = contacts
    .map((contact: any) => (contact.email ? String(contact.email).toLowerCase() : null))
    .filter((email: string | null): email is string => Boolean(email));

  if (emails.length > 0) {
    const { data: existingClients } = await client
      .from("clients")
      .select("id, email")
      .in("email", emails);

    existingClients?.forEach((row: any) => {
      if (row.email) {
        emailMap.set(String(row.email).toLowerCase(), row.id);
      }
    });
  }

  for (const contact of contacts) {
    const email = contact.email ? String(contact.email).toLowerCase() : null;
    const fullName = contact.name || [contact.firstName, contact.lastName].filter(Boolean).join(" ");
    const payload = {
      name: fullName || contact.companyName || "GHL Contact",
      company: contact.companyName || null,
      email: contact.email || null,
      phone: contact.phone || null,
      status: "active",
      source: "gohighlevel",
    } as Record<string, unknown>;

    let clientId = email ? emailMap.get(email) ?? null : null;

    if (clientId) {
      await client
        .from("clients")
        .update(payload)
        .eq("id", clientId);
    } else {
      const { data: inserted } = await client
        .from("clients")
        .insert(payload)
        .select("id, email")
        .single();

      clientId = inserted?.id ?? null;
      if (clientId && inserted?.email) {
        emailMap.set(String(inserted.email).toLowerCase(), clientId);
      }
    }

    if (clientId) {
      contactClientMap.set(contact.id, clientId);
    }
  }

  const opportunitiesPayload = await fetchGHL(
    `/opportunities/search?location_id=${integration.location_id}`,
    apiKey,
    "GET",
    undefined,
    client,
    integration
  );
  const opportunities = Array.isArray(opportunitiesPayload?.opportunities)
    ? opportunitiesPayload.opportunities
    : (Array.isArray(opportunitiesPayload) ? opportunitiesPayload : []);

  const dealRows = opportunities.map((opportunity: any) => {
    const contactId = opportunity.contactId || opportunity.contact?.id || opportunity.contact?.contactId;
    const clientId = contactId ? contactClientMap.get(contactId) ?? null : null;
    if (!clientId) {
      return null;
    }

    const amount = parseNumber(opportunity.monetaryValue ?? opportunity.amount ?? opportunity.value ?? null);
    const probabilityRaw = parseNumber(opportunity.probability ?? null);
    const probability = probabilityRaw && probabilityRaw <= 1 ? probabilityRaw * 100 : probabilityRaw;

    const stage = opportunity.stageName
      || opportunity.status
      || opportunity.pipelineStage
      || opportunity.pipelineStageName
      || null;

    const pipeline = opportunity.pipelineName || opportunity.pipelineId || null;

    return {
      hubspot_id: `ghl:${opportunity.id}`,
      client_id: clientId,
      name: opportunity.name || opportunity.title || `Opportunity ${opportunity.id}`,
      amount,
      stage,
      pipeline,
      probability,
      close_date: parseDate(opportunity.closeDate || opportunity.expectedCloseDate || null),
      deal_type: "gohighlevel",
    } as Record<string, unknown>;
  }).filter((deal: any): deal is Record<string, unknown> => Boolean(deal));

  if (dealRows.length > 0) {
    await client.from("deals").upsert(dealRows, { onConflict: "hubspot_id" });
  }

  const pipelineValue = dealRows.reduce((sum: number, deal: any) => {
    const amount = typeof deal.amount === "number" ? deal.amount : Number(deal.amount ?? 0);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);

  const now = new Date().toISOString();
  const duration = Date.now() - startTime;

  await client
    .from("gohighlevel_integrations")
    .update({ updated_at: now })
    .eq("id", integration.id);

  // Log successful sync
  await client
    .from("analytics_data")
    .insert([
      {
        source: "gohighlevel",
        metric_name: "integration_sync",
        metric_value: contactsToInsert.length,
        dimensions: {
          ...syncMetadata,
          status: "success",
          contacts: contactsToInsert.length,
          deals: dealRows.length,
          pipelineValue,
          duration_ms: duration,
          completed_at: now,
        },
        recorded_at: now,
      },
    ]);

  console.log(`[GHL] Sync completed successfully in ${duration}ms: ${contactsToInsert.length} contacts, ${dealRows.length} deals`);

  return {
    contactsSynced: contactsToInsert.length,
    dealsSynced: dealRows.length,
    pipelineValue,
  };
  } catch (error) {
    // Log failed sync
    const errorMessage = error instanceof Error ? error.message : "Unknown sync error";
    const duration = Date.now() - startTime;

    console.error(`[GHL] Sync failed after ${duration}ms:`, errorMessage);

    try {
      await client
        .from("analytics_data")
        .insert([
          {
            source: "gohighlevel",
            metric_name: "integration_sync_error",
            metric_value: 0,
            dimensions: {
              ...syncMetadata,
              status: "error",
              error: errorMessage,
              duration_ms: duration,
              completed_at: new Date().toISOString(),
            },
            recorded_at: new Date().toISOString(),
          },
        ]);
    } catch (logError) {
      console.error("[GHL] Failed to log sync error:", logError);
    }

    throw error;
  }
}

async function handleGetIntegration(req: Request): Promise<Response> {
  const headers = { ...corsHeaders, "Content-Type": "application/json" };
  try {
    const client = await createSupabaseClient(req);
    const userId = await requireAuth(client);
    if (!userId) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { headers, status: 401 });
    }

    const { data } = await client
      .from("gohighlevel_integrations")
      .select("id, location_id, location_name, is_active, updated_at")
      .eq("user_id", userId)
      .eq("is_active", true);

    return new Response(JSON.stringify({
      ok: true,
      integrations: data ?? [],
    }), { headers });
  } catch (error) {
    console.error("[GHL] GET integration", error);
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }), { headers, status: 500 });
  }
}

async function handleCreateIntegration(req: Request): Promise<Response> {
  const headers = { ...corsHeaders, "Content-Type": "application/json" };
  try {
    const body = await req.json();
    const apiKey = body?.apiKey;
    const locationId = body?.locationId ?? null;
    const locationName = body?.locationName ?? null;
    const refreshToken = body?.refreshToken ?? null; // Optional: for OAuth flow
    const expiresIn = body?.expiresIn ?? null; // Optional: token expiration in seconds

    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: "API key required" }), { headers, status: 400 });
    }

    if (!locationId) {
      return new Response(JSON.stringify({ ok: false, error: "Location ID required" }), { headers, status: 400 });
    }

    const client = await createSupabaseClient(req);
    const userId = await requireAuth(client);
    if (!userId) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { headers, status: 401 });
    }

    // Verify the credentials are valid before saving
    try {
      const testResponse = await fetch(`${GHL_API_BASE}/locations/${locationId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Version: "2021-07-28",
        },
      });

      if (!testResponse.ok) {
        if (testResponse.status === 401 || testResponse.status === 403) {
          return new Response(
            JSON.stringify({ ok: false, error: "Invalid API key or insufficient permissions. Please verify your credentials." }),
            { headers, status: 400 }
          );
        } else if (testResponse.status === 404) {
          return new Response(
            JSON.stringify({ ok: false, error: `Location ID "${locationId}" not found. Please verify the location ID is correct.` }),
            { headers, status: 400 }
          );
        } else {
          const errorText = await testResponse.text();
          return new Response(
            JSON.stringify({ ok: false, error: `GoHighLevel API error (${testResponse.status}): ${errorText}` }),
            { headers, status: 400 }
          );
        }
      }

      const locationData = await testResponse.json();
      const verifiedLocationName = locationName || locationData?.name || locationData?.location?.name || null;

      // Check if this location is already connected
      const { data: existing } = await client
        .from("gohighlevel_integrations")
        .select("id, location_name")
        .eq("user_id", userId)
        .eq("location_id", locationId)
        .eq("is_active", true)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: `Location "${existing.location_name || locationId}" is already connected.`
          }),
          { headers, status: 400 }
        );
      }

      const encryptedKey = await encryptSecret(apiKey);

      // Detect token type: JWT tokens have 3 parts separated by dots
      const isJWT = apiKey.split('.').length === 3;
      const tokenType = isJWT ? 'oauth' : 'private_api_key';

      console.log(`[GHL] Detected token type: ${tokenType}`);

      const insertData: any = {
        user_id: userId,
        api_key_encrypted: encryptedKey,
        location_id: locationId,
        location_name: verifiedLocationName,
        is_active: true,
        token_type: tokenType,
      };

      // Handle OAuth tokens with refresh capability
      if (refreshToken) {
        const encryptedRefreshToken = await encryptSecret(refreshToken);
        insertData.refresh_token_encrypted = encryptedRefreshToken;

        // Calculate expiration time
        if (expiresIn) {
          const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
          insertData.token_expires_at = expiresAt;
          console.log(`[GHL] OAuth token will expire at ${expiresAt}`);
        }
      } else if (isJWT) {
        // JWT detected but no refresh token provided - warn user
        console.warn(`[GHL] OAuth token detected but no refresh token provided. Token refresh will not work when it expires.`);
      }
      
      const { data, error } = await client
        .from("gohighlevel_integrations")
        .insert(insertData)
        .select("id, location_id, location_name, is_active, updated_at")
        .single();

      if (error) throw error;

      const now = new Date().toISOString();
      await client
        .from("analytics_data")
        .insert({
          source: "gohighlevel",
          metric_name: "integration_sync",
          metric_value: 0,
          dimensions: {
            event: "integration_connected",
            triggeredBy: "manual",
            location_id: locationId,
          },
          recorded_at: now,
        });

      return new Response(JSON.stringify({ ok: true, integration: data }), { headers, status: 201 });
    } catch (fetchError) {
      console.error("[GHL] Failed to verify credentials:", fetchError);
      return new Response(
        JSON.stringify({
          ok: false,
          error: fetchError instanceof Error ? fetchError.message : "Failed to verify GoHighLevel credentials"
        }),
        { headers, status: 500 }
      );
    }
  } catch (error) {
    console.error("[GHL] create integration", error);
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { headers, status: 500 }
    );
  }
}

async function handleDeleteIntegration(req: Request, integrationId: string): Promise<Response> {
  const headers = { ...corsHeaders, "Content-Type": "application/json" };
  try {
    const client = await createSupabaseClient(req);
    const userId = await requireAuth(client);
    if (!userId) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { headers, status: 401 });
    }

    const { data: integration } = await client
      .from("gohighlevel_integrations")
      .select("id")
      .eq("id", integrationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!integration) {
      return new Response(JSON.stringify({ ok: false, error: "Integration not found" }), { headers, status: 404 });
    }

    await client
      .from("gohighlevel_integrations")
      .update({ is_active: false })
      .eq("id", integrationId);

    await client
      .from("gohighlevel_contacts")
      .delete()
      .eq("integration_id", integrationId);

    return new Response(JSON.stringify({ ok: true }), { headers });
  } catch (error) {
    console.error("[GHL] delete integration", error);
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }), { headers, status: 500 });
  }
}

async function handlePushClient(req: Request): Promise<Response> {
  const headers = { ...corsHeaders, "Content-Type": "application/json" };
  try {
    const client = await createSupabaseClient(req);
    const userId = await requireAuth(client);
    if (!userId) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { headers, status: 401 });
    }

    const { clientId } = await req.json();
    if (!clientId) {
      return new Response(JSON.stringify({ ok: false, error: "Client ID is required" }), { headers, status: 400 });
    }

    const { data: integration, error: integrationError } = await client
      .from("gohighlevel_integrations")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (integrationError || !integration) {
      return new Response(JSON.stringify({ ok: false, error: "No active GoHighLevel integration found" }), { headers, status: 404 });
    }

    const decryptedKey = await getValidAccessToken(client, integration);
    if (!decryptedKey) {
      return new Response(JSON.stringify({ ok: false, error: "Failed to get valid access token" }), { headers, status: 500 });
    }

    const { data: clientData, error: clientError } = await client
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (clientError || !clientData) {
      return new Response(JSON.stringify({ ok: false, error: "Client not found" }), { headers, status: 404 });
    }

    // Validate that at least one contact method exists (treat empty strings as missing)
    const hasEmail = clientData.email && String(clientData.email).trim() !== "";
    const hasPhone = clientData.phone && String(clientData.phone).trim() !== "";

    if (!hasEmail && !hasPhone) {
      const clientName = clientData.name || clientData.company || "This client";
      const missingFields: string[] = [];
      if (!hasEmail) missingFields.push("email");
      if (!hasPhone) missingFields.push("phone");

      const errorMessage = `Cannot sync '${clientName}' to Leadslift CRM. ${
        missingFields.length === 2
          ? "This client is missing both email and phone number"
          : `This client is missing ${missingFields[0]}`
      }. Please add at least one contact method to the client record before syncing.`;

      return new Response(JSON.stringify({
        ok: false,
        error: errorMessage,
        clientName,
        missingFields
      }), { headers, status: 400 });
    }

    let ghlContactId = clientData.gohighlevel_contact_id;
    let action = "created";

    // Parse contact name into first and last name
    const contactName = clientData.name || clientData.contact_person || "";
    const { firstName, lastName } = splitName(contactName);

    // Build contact data - locationId is required for creating new contacts
    // but must NOT be included when updating existing contacts
    const contactData: any = {
      email: clientData.email || undefined,
      phone: clientData.phone || undefined,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      name: contactName || undefined,
      companyName: clientData.company || undefined,
      website: clientData.website || undefined,
      address1: clientData.address || undefined,
      city: clientData.city || undefined,
      state: clientData.state || undefined,
      country: clientData.country || undefined,
      postalCode: clientData.postal_code || undefined,
      source: "LeadsLift CRM",
      tags: ["leadsift-crm", clientData.industry || ""].filter(Boolean),
    };

    // If we have an existing GHL contact ID, include it in the upsert to ensure we update the correct contact
    // Do NOT include locationId when updating - GHL API rejects it
    if (ghlContactId) {
      contactData.id = ghlContactId;
      console.log("[GHL] Using upsert endpoint to update existing client:", clientData.name, "with contact ID:", ghlContactId);
    } else {
      // Only include locationId when creating new contacts
      contactData.locationId = integration.location_id;
      console.log("[GHL] Using upsert endpoint to create new client:", clientData.name);
    }

    // Always use upsert endpoint - it handles both create and update operations
    const upsertResult = await fetchGHL(`/contacts/upsert`, decryptedKey, "POST", contactData, client, integration);

    const returnedContactId = upsertResult?.contact?.id || upsertResult?.id;

    // If we had an existing contact ID, this is an update
    if (ghlContactId) {
      action = "updated";
      // Use the returned ID if available, otherwise keep the existing one
      ghlContactId = returnedContactId || ghlContactId;
    } else {
      // Determine action based on response
      ghlContactId = returnedContactId;
      if (upsertResult?.new === true) {
        action = "created";
      } else {
        action = "linked"; // Contact already existed, was updated
      }
    }

    if (!ghlContactId) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Failed to create or find contact in GoHighLevel",
        }),
        { headers, status: 500 }
      );
    }

    const { error: updateError } = await client
      .from("clients")
      .update({
        gohighlevel_contact_id: ghlContactId,
        gohighlevel_last_synced_at: new Date().toISOString(),
      })
      .eq("id", clientId);

    if (updateError) {
      console.error("[GHL] Failed to update client sync status:", updateError);
    }

    await client.from("control_tower_sync_log").insert({
      sync_type: "push",
      entity_type: "client",
      entity_id: clientId,
      control_tower_id: ghlContactId,
      status: "success",
      synced_by: userId,
      payload: { action, ghl_contact_id: ghlContactId },
    });

    // Create opportunity in GHL Developer pipeline at Lead Acquired stage
    // Only create opportunities for new contacts (action === "created"), not updates
    let opportunityId: string | null = null;
    let opportunityCreated = false;

    if (action === "created") {
      try {
        if (!integration.location_id) {
          console.warn("[GHL] Cannot create opportunity: location_id is missing");
        } else {
          const pipelineStageInfo = await findPipelineAndStage(
            decryptedKey,
            integration.location_id,
            "GHL Developer",
            "Lead Acquired",
            client,
            integration
          );

          if (pipelineStageInfo) {
            const opportunityTitle = clientData.company
              ? `${clientData.company} - Client Opportunity`
              : contactName
                ? `${contactName} - Client Opportunity`
                : "Client Opportunity";

            opportunityId = await createOpportunity(
              decryptedKey,
              ghlContactId,
              pipelineStageInfo.pipelineId,
              pipelineStageInfo.stageId,
              opportunityTitle,
              contactName,
              client,
              integration
            );

            if (opportunityId) {
              opportunityCreated = true;
              console.log(`[GHL] Successfully created opportunity ${opportunityId} for client ${clientId}`);
            }
          } else {
            console.warn("[GHL] Could not find 'GHL Developer' pipeline or 'Lead Acquired' stage");
          }
        }
      } catch (opportunityError) {
        // Don't fail the entire operation if opportunity creation fails
        console.error("[GHL] Failed to create opportunity (non-fatal):", opportunityError);
      }
    } else {
      console.log(`[GHL] Skipping opportunity creation for client ${clientId} (action: ${action})`);
    }

    const successMessage = opportunityCreated
      ? `Client ${action} in Leadslift CRM and opportunity created`
      : `Client ${action} in Leadslift CRM`;

    return new Response(
      JSON.stringify({
        ok: true,
        action,
        ghlContactId,
        opportunityId,
        opportunityCreated,
        message: successMessage,
      }),
      { headers }
    );
  } catch (error) {
    console.error("[GHL] Push client error:", error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "Failed to push client to GoHighLevel",
      }),
      { headers, status: 500 }
    );
  }
}

async function handlePushLead(req: Request): Promise<Response> {
  const headers = { ...corsHeaders, "Content-Type": "application/json" };
  try {
    const client = await createSupabaseClient(req);
    const userId = await requireAuth(client);
    if (!userId) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { headers, status: 401 });
    }

    const { leadId } = await req.json();
    if (!leadId) {
      return new Response(JSON.stringify({ ok: false, error: "Lead ID is required" }), { headers, status: 400 });
    }

    const { data: integration, error: integrationError } = await client
      .from("gohighlevel_integrations")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (integrationError || !integration) {
      return new Response(JSON.stringify({ ok: false, error: "No active GoHighLevel integration found" }), { headers, status: 404 });
    }

    const decryptedKey = await getValidAccessToken(client, integration);
    if (!decryptedKey) {
      return new Response(JSON.stringify({ ok: false, error: "Failed to get valid access token" }), { headers, status: 500 });
    }

    const { data: leadData, error: leadError } = await client
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError || !leadData) {
      return new Response(JSON.stringify({ ok: false, error: "Lead not found" }), { headers, status: 404 });
    }

    // Validate that at least one contact method exists (treat empty strings as missing)
    const hasEmail = leadData.email && String(leadData.email).trim() !== "";
    const hasPhone = leadData.phone && String(leadData.phone).trim() !== "";

    if (!hasEmail && !hasPhone) {
      const leadName = leadData.contact_name || leadData.company_name || "This lead";
      const missingFields: string[] = [];
      if (!hasEmail) missingFields.push("email");
      if (!hasPhone) missingFields.push("phone");

      const errorMessage = `Cannot sync '${leadName}' to Leadslift CRM. ${
        missingFields.length === 2
          ? "This lead is missing both email and phone number"
          : `This lead is missing ${missingFields[0]}`
      }. Please add at least one contact method to the lead record before syncing.`;

      return new Response(JSON.stringify({
        ok: false,
        error: errorMessage,
        leadName,
        missingFields
      }), { headers, status: 400 });
    }

    let ghlContactId = leadData.gohighlevel_contact_id;
    let action = "created";

    // Parse contact name into first and last name
    const contactName = leadData.contact_name || "";
    const { firstName, lastName } = splitName(contactName);

    // Build contact data - locationId is required for creating new contacts
    // but must NOT be included when updating existing contacts
    const contactData: any = {
      email: leadData.email || undefined,
      phone: leadData.phone || undefined,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      name: contactName || undefined,
      companyName: leadData.company_name || undefined,
      website: leadData.website || undefined,
      source: "LeadsLift CRM - Lead",
      tags: ["leadsift-crm", "lead", leadData.industry || ""].filter(Boolean),
    };

    // If we have an existing GHL contact ID, include it in the upsert to ensure we update the correct contact
    // Do NOT include locationId when updating - GHL API rejects it
    if (ghlContactId) {
      contactData.id = ghlContactId;
      console.log("[GHL] Using upsert endpoint to update existing lead:", leadData.contact_name, "with contact ID:", ghlContactId);
    } else {
      // Only include locationId when creating new contacts
      contactData.locationId = integration.location_id;
      console.log("[GHL] Using upsert endpoint to create new lead:", leadData.contact_name);
    }

    // Always use upsert endpoint - it handles both create and update operations
    const upsertResult = await fetchGHL(`/contacts/upsert`, decryptedKey, "POST", contactData, client, integration);

    const returnedContactId = upsertResult?.contact?.id || upsertResult?.id;

    // If we had an existing contact ID, this is an update
    if (ghlContactId) {
      action = "updated";
      // Use the returned ID if available, otherwise keep the existing one
      ghlContactId = returnedContactId || ghlContactId;
    } else {
      // Determine action based on response
      ghlContactId = returnedContactId;
      if (upsertResult?.new === true) {
        action = "created";
      } else {
        action = "linked"; // Contact already existed, was updated
      }
    }

    if (!ghlContactId) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Failed to create or find contact in GoHighLevel",
        }),
        { headers, status: 500 }
      );
    }

    // Update the lead record with sync information
    const { error: updateError } = await client
      .from("leads")
      .update({
        gohighlevel_contact_id: ghlContactId,
        gohighlevel_last_synced_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    if (updateError) {
      console.error("[GHL] Failed to update lead sync status:", updateError);
    }

    // Log the sync
    await client.from("control_tower_sync_log").insert({
      sync_type: "push",
      entity_type: "lead",
      entity_id: leadId,
      control_tower_id: ghlContactId,
      status: "success",
      synced_by: userId,
      payload: { action, ghl_contact_id: ghlContactId },
    });

    // Create opportunity in GHL Developer pipeline at Lead Acquired stage
    // Only create opportunities for new contacts (action === "created"), not updates
    let opportunityId: string | null = null;
    let opportunityCreated = false;

    if (action === "created") {
      try {
        if (!integration.location_id) {
          console.warn("[GHL] Cannot create opportunity: location_id is missing");
        } else {
          const pipelineStageInfo = await findPipelineAndStage(
            decryptedKey,
            integration.location_id,
            "GHL Developer",
            "Lead Acquired",
            client,
            integration
          );

          if (pipelineStageInfo) {
            const opportunityTitle = leadData.company_name
              ? `${leadData.company_name} - Lead Opportunity`
              : contactName
                ? `${contactName} - Lead Opportunity`
                : "Lead Opportunity";

            opportunityId = await createOpportunity(
              decryptedKey,
              ghlContactId,
              pipelineStageInfo.pipelineId,
              pipelineStageInfo.stageId,
              opportunityTitle,
              contactName,
              client,
              integration
            );

            if (opportunityId) {
              opportunityCreated = true;
              console.log(`[GHL] Successfully created opportunity ${opportunityId} for lead ${leadId}`);
            }
          } else {
            console.warn("[GHL] Could not find 'GHL Developer' pipeline or 'Lead Acquired' stage");
          }
        }
      } catch (opportunityError) {
        // Don't fail the entire operation if opportunity creation fails
        console.error("[GHL] Failed to create opportunity (non-fatal):", opportunityError);
      }
    } else {
      console.log(`[GHL] Skipping opportunity creation for lead ${leadId} (action: ${action})`);
    }

    const successMessage = opportunityCreated
      ? `Lead ${action} in Leadslift CRM and opportunity created`
      : `Lead ${action} in Leadslift CRM`;

    return new Response(
      JSON.stringify({
        ok: true,
        action,
        ghlContactId,
        opportunityId,
        opportunityCreated,
        message: successMessage,
      }),
      { headers }
    );
  } catch (error) {
    console.error("[GHL] Push lead error:", error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "Failed to push lead to GoHighLevel",
      }),
      { headers, status: 500 }
    );
  }
}

async function handleSyncContacts(req: Request): Promise<Response> {
  const headers = { ...corsHeaders, "Content-Type": "application/json" };
  try {
    const client = await createSupabaseClient(req);
    const userId = await requireAuth(client);
    if (!userId) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { headers, status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const integrationId = body?.integration_id;

    let query = client
      .from("gohighlevel_integrations")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (integrationId) {
      query = query.eq("id", integrationId);
    }

    const { data: integration, error } = await query.maybeSingle();

    if (error) throw error;
    if (!integration) {
      return new Response(JSON.stringify({ ok: false, error: "Integration not found" }), { headers, status: 404 });
    }

    const apiKey = await getValidAccessToken(client, integration);
    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: "Integration credentials missing or expired" }), { headers, status: 400 });
    }

    const result = await syncGoHighLevel({
      client,
      integration,
      apiKey,
      triggeredBy: "manual",
    });

    return new Response(JSON.stringify({ ok: true, ...result }), { headers });
  } catch (error) {
    console.error("[GHL] sync", error);
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }), { headers, status: 500 });
  }
}

async function handleTestConnection(req: Request): Promise<Response> {
  const headers = { ...corsHeaders, "Content-Type": "application/json" };
  try {
    const body = await req.json();
    const apiKey = body?.apiKey;
    const locationId = body?.locationId ?? null;

    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: "API key required for testing" }), { headers, status: 400 });
    }

    // Test the API key by making a simple request
    // If locationId is provided, verify it exists; otherwise just test the API key
    let testEndpoint = "/locations/";
    let testMethod = "GET";

    if (locationId) {
      // Test by getting location details
      testEndpoint = `/locations/${locationId}`;
    }

    try {
      const response = await fetch(`${GHL_API_BASE}${testEndpoint}`, {
        method: testMethod,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Version: "2021-07-28",
        },
      });

      if (!response.ok) {
        const text = await response.text();
        let errorMessage = "Connection failed";

        if (response.status === 401 || response.status === 403) {
          errorMessage = "Invalid API key or insufficient permissions";
        } else if (response.status === 404) {
          errorMessage = locationId
            ? `Location ID "${locationId}" not found. Please verify the location ID is correct.`
            : "Invalid API endpoint";
        } else {
          errorMessage = `GoHighLevel API error (${response.status}): ${text}`;
        }

        return new Response(
          JSON.stringify({
            ok: false,
            error: errorMessage,
            status: response.status
          }),
          { headers, status: 200 } // Return 200 with error details for better UX
        );
      }

      const data = await response.json();
      const locationName = data?.name || data?.location?.name || null;

      return new Response(
        JSON.stringify({
          ok: true,
          message: locationId
            ? `Successfully connected to location: ${locationName || locationId}`
            : "API key is valid",
          locationName,
        }),
        { headers }
      );
    } catch (fetchError) {
      console.error("[GHL] Test connection fetch error:", fetchError);
      return new Response(
        JSON.stringify({
          ok: false,
          error: fetchError instanceof Error ? fetchError.message : "Failed to connect to GoHighLevel API",
        }),
        { headers, status: 200 }
      );
    }
  } catch (error) {
    console.error("[GHL] Test connection error:", error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "Unable to test connection"
      }),
      { headers, status: 500 }
    );
  }
}

async function handleWebhook(req: Request): Promise<Response> {
  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  // Webhook security validation
  const secret = Deno.env.get("GHL_WEBHOOK_SECRET");
  if (!secret) {
    console.warn("[GHL] GHL_WEBHOOK_SECRET not configured. Webhook endpoint is publicly accessible!");
    // Still allow webhook to proceed but log warning
  } else {
    const provided = req.headers.get("x-webhook-secret") || req.headers.get("x-ghl-secret");
    if (provided !== secret) {
      console.error("[GHL] Webhook authentication failed. Invalid secret provided.");
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized - invalid webhook secret" }),
        { headers, status: 401 }
      );
    }
  }

  try {
    const payload = await req.json();
    const locationId = payload?.locationId || payload?.data?.locationId || payload?.location_id || null;
    if (!locationId) {
      return new Response(JSON.stringify({ ok: false, error: "Missing location" }), { headers, status: 400 });
    }

    const client = await createSupabaseClient(undefined, true);
    const { data: integration } = await client
      .from("gohighlevel_integrations")
      .select("id, user_id, api_key_encrypted, location_id, location_name, is_active, created_at, updated_at")
      .eq("location_id", locationId)
      .eq("is_active", true)
      .maybeSingle();

    if (!integration) {
      return new Response(JSON.stringify({ ok: false, error: "Integration not found" }), { headers, status: 404 });
    }

    const apiKey = await decryptSecret(integration.api_key_encrypted);
    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: "Integration credentials missing" }), { headers, status: 400 });
    }

    const result = await syncGoHighLevel({
      client,
      integration,
      apiKey,
      triggeredBy: "webhook",
    });

    return new Response(JSON.stringify({ ok: true, ...result }), { headers });
  } catch (error) {
    console.error("[GHL] webhook", error);
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }), { headers, status: 500 });
  }
}

Deno.serve(async (req) => {
  // Validate environment on first request
  const envCheck = validateEnvironment();
  if (!envCheck.valid) {
    console.error("[GHL] Missing required environment variables:", envCheck.missing);
    return new Response(
      JSON.stringify({
        ok: false,
        error: `Server configuration error: Missing required environment variables: ${envCheck.missing.join(", ")}`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathname = url.pathname.replace(/\/gohighlevel-manage/, "") || "/";

  if (req.method === "GET" && pathname === "/integration") {
    return handleGetIntegration(req);
  }

  if (req.method === "POST" && pathname === "/integration") {
    return handleCreateIntegration(req);
  }

  if (req.method === "DELETE" && pathname === "/integration") {
    const body = await req.json();
    const integrationId = body?.integration_id;
    if (!integrationId) {
      return new Response(JSON.stringify({ ok: false, error: "integration_id required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    return handleDeleteIntegration(req, integrationId);
  }

  if (req.method === "POST" && pathname === "/sync-contacts") {
    return handleSyncContacts(req);
  }

  if (req.method === "POST" && pathname === "/push-client") {
    return handlePushClient(req);
  }

  if (req.method === "POST" && pathname === "/push-lead") {
    return handlePushLead(req);
  }

  if (req.method === "POST" && pathname === "/test-connection") {
    return handleTestConnection(req);
  }

  if (req.method === "POST" && pathname === "/webhook") {
    return handleWebhook(req);
  }

  return new Response(JSON.stringify({ error: "Not Found" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 404,
  });
});

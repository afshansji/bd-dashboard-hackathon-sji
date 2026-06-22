import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";
import Exa from "https://esm.sh/exa-js@1.0.12";

const headers = { ...corsHeaders, "Content-Type": "application/json" } as const;

const RequestSchema = z.object({
  campaignId: z.string().uuid(),
  
  // Required targeting filters
  jobTitles: z.array(z.string()).min(1, "At least one job title required"),
  industries: z.array(z.string()).min(1, "At least one industry required"),
  country: z.string().min(2, "Country is required"),
  companySize: z.array(z.string()).min(1, "Company size is required"),
  
  // Optional filters
  city: z.string().optional(),
  technologies: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  maxResults: z.number().int().positive().max(100).default(25),
  userLocation: z.string().optional(),
});

type JsonRecord = Record<string, unknown>;

const EXA_COST_PER_LEAD = 0.10;

function buildSearchQuery(params: {
  jobTitles: string[];
  industries: string[];
  country: string;
  city?: string;
  companySize: string[];
  technologies?: string[];
  keywords?: string[];
}): string {
  // Simplified company size mapping
  const sizeMap: Record<string, string> = {
    "Startup (1-50)": "startup",
    "Small (51-200)": "small",
    "Medium (201-1,000)": "medium",
    "Large (1,001-5,000)": "large",
    "Enterprise (5,000+)": "enterprise",
  };
  
  // Build job title part with OR
  const titlePart = params.jobTitles.join(" OR ");
  
  // Build industry part with OR
  const industryPart = params.industries.join(" OR ");
  
  // Build location part
  const locationPart = params.city
    ? `${params.city}, ${params.country}`
    : params.country;
  
  // Build company size part with simplified terms
  const sizePart = params.companySize
    .map(size => sizeMap[size] || size.toLowerCase())
    .join(" OR ");
  
  // Build technology part (only if provided)
  const techPart = params.technologies && params.technologies.length > 0
    ? params.technologies.join(", ")
    : "";
  
  // Build additional keywords
  const keywordPart = params.keywords && params.keywords.length > 0
    ? params.keywords.join(" ")
    : "";
  
  // Use pipe separators for clearer filter separation
  const queryParts = [
    titlePart,
    industryPart,
    locationPart,
    sizePart,
  ];
  
  // Add optional parts
  if (techPart) queryParts.push(techPart);
  if (keywordPart) queryParts.push(keywordPart);
  
  return queryParts.join(" | ");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const exaApiKey = Deno.env.get("EXA_API_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Supabase environment variables are not configured" }, 500);
  }

  if (!exaApiKey) {
    return jsonResponse({ error: "EXA_API_KEY is not configured" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Missing authorization header" }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", "")
  );

  if (authError || !user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch (_error) {
    return jsonResponse({ error: "Invalid JSON payload" }, 400);
  }

  let payload: z.infer<typeof RequestSchema>;
  try {
    payload = RequestSchema.parse(body);
  } catch (error) {
    return jsonResponse({ error: "Invalid request payload", details: formatZodError(error) }, 400);
  }

  // Verify campaign access
  const { data: campaign, error: campaignError } = await supabase
    .from("bd_campaigns")
    .select("id, created_by, owned_by")
    .eq("id", payload.campaignId)
    .single();

  if (campaignError || !campaign) {
    return jsonResponse({ error: "Campaign not found" }, 404);
  }

  if (campaign.created_by !== user.id && campaign.owned_by !== user.id) {
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = userRoles?.some(r => r.role === "admin" || r.role === "super_admin");
    if (!isAdmin) {
      return jsonResponse({ error: "Access denied" }, 403);
    }
  }

  try {
    // Create job record immediately
    const { data: job, error: jobError } = await supabase
      .from("lead_import_jobs")
      .insert({
        user_id: user.id,
        campaign_id: payload.campaignId,
        job_type: "campaign",
        status: "pending",
        notify_email: user.email,
        criteria: {
          jobTitles: payload.jobTitles,
          industries: payload.industries,
          country: payload.country,
          city: payload.city,
          companySize: payload.companySize,
          technologies: payload.technologies,
          keywords: payload.keywords,
          max_results: payload.maxResults,
          userLocation: payload.userLocation,
        },
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (jobError || !job) {
      console.error("[campaign-lead-import] Failed to create job:", jobError);
      return jsonResponse({ error: "Failed to create import job" }, 500);
    }

    // Process in background (non-blocking) - fire and forget
    processLeadImportJob(job.id, exaApiKey, supabase, payload, user.id)
      .catch((err) => {
        console.error(`[campaign-lead-import] Background job ${job.id} failed:`, err);
        supabase
          .from("lead_import_jobs")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_details: err instanceof Error ? err.message : "Unknown error",
          })
          .eq("id", job.id)
          .then(() => console.log(`[campaign-lead-import] Job ${job.id} marked as failed`));
      });

    // Return immediately with job_id
    return new Response(
      JSON.stringify({
        success: true,
        job_id: job.id,
        status: "pending",
        message: "Lead import started. You will be notified via email when complete.",
        estimated_time: "2-5 minutes",
      }),
      { status: 202, headers }
    );
  } catch (error) {
    console.error("[campaign-lead-import]", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});

function jsonResponse(body: JsonRecord, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}

function formatZodError(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.flatten();
  }
  return { message: error instanceof Error ? error.message : String(error) };
}

async function searchExaLeads(
  apiKey: string,
  searchParams: {
    jobTitles: string[];
    industries: string[];
    country: string;
    city?: string;
    companySize: string[];
    technologies?: string[];
    keywords?: string[];
  },
  maxResults: number,
  userLocation?: string
): Promise<unknown[]> {
  console.log("[searchExaLeads] Initializing Exa client...");
  const exa = new Exa(apiKey);

  // Build simplified semantic query
  const query = buildSearchQuery(searchParams);
  console.log("[searchExaLeads] Simplified query:", query);

  const searchOptions: any = {
    text: true,
    type: "neural", // Use neural for better semantic matching
    category: "company", // Use "company" category for business profiles
    numResults: maxResults,
    includeDomains: ["linkedin.com"], // Restrict to LinkedIn only
  };

  // Add optional user location
  if (userLocation) {
    searchOptions.userLocation = userLocation.toLowerCase();
  }

  console.log("[searchExaLeads] Search options:", JSON.stringify(searchOptions, null, 2));

  try {
    console.log("[searchExaLeads] Calling Exa API...");
    const result = await exa.searchAndContents(query, searchOptions);
    console.log(`[searchExaLeads] Exa API Response - Found ${result.results?.length || 0} results`);
    
    if (result.results?.length === 0) {
      console.warn(`[searchExaLeads] Zero results for query: "${query}"`);
      console.warn(`[searchExaLeads] Consider simplifying search criteria`);
    }
    
    return result.results || [];
  } catch (error) {
    console.error("[searchExaLeads] Exa API Error:", error);
    console.error("[searchExaLeads] Query was:", query);
    console.error("[searchExaLeads] Options were:", JSON.stringify(searchOptions));
    
    // Provide more helpful error message
    let errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check for common issues
    if (errorMessage.includes("<!DOCTYPE") || errorMessage.includes("is not valid JSON")) {
      errorMessage = "EXA_API_KEY is not configured or invalid. Please add your Exa API key to Supabase secrets and redeploy the function. See EXA_SETUP_GUIDE.md for instructions.";
    } else if (errorMessage.includes("401") || errorMessage.includes("unauthorized")) {
      errorMessage = "Invalid Exa API key. Please verify your EXA_API_KEY in Supabase secrets.";
    } else if (errorMessage.includes("429") || errorMessage.includes("rate limit")) {
      errorMessage = "Exa API rate limit exceeded. Please wait a few minutes and try again, or upgrade your Exa plan.";
    }
    
    throw new Error(`Exa search failed: ${errorMessage}`);
  }
}

interface NormalizedLead {
  exaItemId: string | null;
  contactName: string | null;
  companyName: string | null;
  email: string | null;
  linkedinUrl: string | null;
  title: string | null;
  score: number | null;
  metadata: JsonRecord;
}

function normalizeLeads(items: unknown[]): NormalizedLead[] {
  const results: NormalizedLead[] = [];
  for (const item of items) {
    const normalized = normalizeLeadItem(item);
    if (!normalized) continue;
    if (!normalized.exaItemId && !normalized.email && !normalized.linkedinUrl) continue;
    results.push(normalized);
  }
  return results;
}

function normalizeLeadItem(raw: unknown): NormalizedLead | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as JsonRecord;

  // Exa Search API returns results in a specific format
  const id = extractStringFromPaths(record, ["id"]);
  const url = extractStringFromPaths(record, ["url"]);
  const title = extractStringFromPaths(record, ["title"]);
  const text = extractStringFromPaths(record, ["text"]);
  const score = extractNumberFromPaths(record, ["score"]);

  // Extract name and company from title/text
  const titleParts = title?.split("|").map(s => s.trim()) || [];
  const contactName = titleParts[0] || null;
  const companyName = titleParts[1] || extractStringFromPaths(record, ["author"]);

  return {
    exaItemId: id,
    contactName,
    companyName,
    email: null, // Exa doesn't always provide email
    linkedinUrl: url?.includes("linkedin.com") ? url : null,
    title: titleParts[2] || null,
    score,
    metadata: { ...record, text_preview: text?.substring(0, 200) },
  };
}

function dedupeLeads(leads: NormalizedLead[]): NormalizedLead[] {
  const seen = new Set<string>();
  const results: NormalizedLead[] = [];

  for (const lead of leads) {
    const key = lead.exaItemId ?? lead.email ?? lead.linkedinUrl;
    if (key) {
      if (seen.has(key)) continue;
      seen.add(key);
    }
    results.push(lead);
  }

  return results;
}

function extractStringFromPaths(obj: JsonRecord, paths: string[]): string | null {
  for (const path of paths) {
    const val = getNestedValue(obj, path);
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return null;
}

function extractNumberFromPaths(obj: JsonRecord, paths: string[]): number | null {
  for (const path of paths) {
    const val = getNestedValue(obj, path);
    if (typeof val === "number") return val;
  }
  return null;
}

function extractArrayFromPaths(obj: JsonRecord, paths: string[]): unknown[] {
  for (const path of paths) {
    const val = getNestedValue(obj, path);
    if (Array.isArray(val)) return val;
  }
  return [];
}

function getNestedValue(obj: JsonRecord, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === "object" && part in (current as JsonRecord)) {
      current = (current as JsonRecord)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

function flattenNested(obj: JsonRecord): JsonRecord {
  const result: JsonRecord = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = flattenNested(value as JsonRecord);
      for (const [nestedKey, nestedValue] of Object.entries(nested)) {
        result[`${key}.${nestedKey}`] = nestedValue;
      }
    }
  }
  return result;
}

function toJsonRecord(val: unknown): JsonRecord {
  if (val && typeof val === "object" && !Array.isArray(val)) {
    return val as JsonRecord;
  }
  return {};
}

async function processLeadImportJob(
  jobId: string,
  exaApiKey: string,
  supabase: any,
  payload: {
    campaignId: string;
    jobTitles: string[];
    industries: string[];
    country: string;
    companySize: string[];
    city?: string;
    technologies?: string[];
    keywords?: string[];
    maxResults: number;
    dateRange?: { start?: string; end?: string };
    excludeText?: string[];
    userLocation?: string;
  },
  userId: string
) {
  try {
    // Update status to running
    await supabase
      .from("lead_import_jobs")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", jobId);

    console.log(`[processLeadImportJob] Starting job ${jobId} for campaign ${payload.campaignId}`);

    // Call Exa.ai Search API with simplified filters
    const results = await searchExaLeads(
      exaApiKey,
      {
        jobTitles: payload.jobTitles,
        industries: payload.industries,
        country: payload.country,
        city: payload.city,
        companySize: payload.companySize,
        technologies: payload.technologies,
        keywords: payload.keywords,
      },
      payload.maxResults,
      payload.userLocation
    );

    console.log(`[processLeadImportJob] Received ${results.length} results from Exa`);

    // Store search results metadata
    await supabase
      .from("lead_import_jobs")
      .update({
        criteria: {
          ...payload,
          results_count: results.length,
        },
      })
      .eq("id", jobId);

    const normalizedLeads = dedupeLeads(normalizeLeads(results));

    if (normalizedLeads.length === 0) {
      await supabase
        .from("lead_import_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          imported_count: 0,
        })
        .eq("id", jobId);
      return;
    }

    // Fetch existing campaign contacts from relational table
    console.log(`[processLeadImportJob] Fetching existing contacts for campaign ${payload.campaignId}...`);
    const { data: existingContacts, error: fetchError } = await supabase
      .from("campaign_contacts")
      .select("id, exa_item_id, contact_email, contact_linkedin_url, status")
      .eq("campaign_id", payload.campaignId);

    if (fetchError) {
      console.error(`[processLeadImportJob] Error fetching existing contacts:`, fetchError);
    }

    console.log(`[processLeadImportJob] Found ${existingContacts?.length || 0} existing contacts`);

    // Build insert/update arrays
    const contactsToInsert = [];
    const contactsToUpdate = [];

    for (const lead of normalizedLeads) {
      // Find existing contact by exa_item_id, email, or LinkedIn URL
      const existing = existingContacts?.find(
        (c: { exa_item_id?: string; contact_email?: string; contact_linkedin_url?: string }) =>
          (c.exa_item_id && lead.exaItemId && c.exa_item_id === lead.exaItemId) ||
          (c.contact_email && lead.email && c.contact_email === lead.email) ||
          (c.contact_linkedin_url && lead.linkedinUrl && c.contact_linkedin_url === lead.linkedinUrl)
      ) as { id: string; status?: string } | undefined;

      if (existing) {
        // Update existing contact (keep status, update other fields)
        contactsToUpdate.push({
          id: existing.id,
          contact_name: lead.contactName || "Unknown",
          contact_email: lead.email,
          contact_linkedin_url: lead.linkedinUrl,
          contact_company: lead.companyName,
          contact_title: lead.title,
          exa_score: lead.score,
          metadata: lead.metadata,
          last_enriched_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else {
        // Insert new contact
        contactsToInsert.push({
          campaign_id: payload.campaignId,
          contact_name: lead.contactName || "Unknown",
          contact_email: lead.email,
          contact_linkedin_url: lead.linkedinUrl,
          contact_company: lead.companyName,
          contact_title: lead.title,
          status: "identified",
          exa_item_id: lead.exaItemId,
          exa_score: lead.score,
          metadata: lead.metadata,
          last_enriched_at: new Date().toISOString(),
        });
      }
    }

    console.log(
      `[processLeadImportJob] ${contactsToInsert.length} new contacts to insert, ${contactsToUpdate.length} to update`
    );

    // Batch insert new contacts
    if (contactsToInsert.length > 0) {
      const { error: insertError } = await supabase.from("campaign_contacts").insert(contactsToInsert);

      if (insertError) {
        throw new Error(`Failed to insert contacts: ${insertError.message}`);
      }
      console.log(`[processLeadImportJob] Inserted ${contactsToInsert.length} new contacts`);
    }

    // Batch update existing contacts
    if (contactsToUpdate.length > 0) {
      for (const contact of contactsToUpdate) {
        const { error: updateError } = await supabase
          .from("campaign_contacts")
          .update(contact)
          .eq("id", contact.id);

        if (updateError) {
          console.error(`[processLeadImportJob] Failed to update contact ${contact.id}:`, updateError);
        }
      }
      console.log(`[processLeadImportJob] Updated ${contactsToUpdate.length} existing contacts`);
    }

    // Update job as completed
    await supabase
      .from("lead_import_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        imported_count: contactsToInsert.length,
      })
      .eq("id", jobId);

    console.log(`[processLeadImportJob] Job ${jobId} completed: ${contactsToInsert.length} new, ${contactsToUpdate.length} updated`);

    // Send email notification
    try {
      await supabase.functions.invoke("send-lead-import-notification", {
        body: {
          jobId,
          campaignId: payload.campaignId,
          results: { 
            imported: contactsToInsert.length, 
            updated: contactsToUpdate.length, 
            total: normalizedLeads.length 
          },
        },
      });
    } catch (emailError) {
      console.error("[processLeadImportJob] Email notification failed:", emailError);
      // Don't fail the whole job if email fails
    }
  } catch (error) {
    console.error(`[processLeadImportJob] Job ${jobId} failed:`, error);
    throw error;
  }
}

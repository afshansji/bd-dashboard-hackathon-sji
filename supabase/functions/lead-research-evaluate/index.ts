import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import Exa from "https://esm.sh/exa-js@1.0.12";

import { corsHeaders } from "../_shared/cors.ts";

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

type ClientRow = {
  id: string;
  name: string;
  company: string | null;
  website: string | null;
};

type ContactRow = {
  id: string;
  client_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  position: string | null;
};

const RequestSchema = z.object({
  client_id: z.string().uuid(),
  contact_id: z.string().uuid().optional(),
  company: z.string().min(1),
  website: z.string().url().optional().nullable(),
  deal_id: z.string().uuid().optional(),
});

type ExaResearch = {
  context: string;
  linkedin?: string | null;
};

type ExaSearchHighlight = { text?: string | null };

type ExaSearchResult = {
  title?: string | null;
  url?: string | null;
  highlights?: ExaSearchHighlight[] | null;
  text?: string | null;
};

type ExaSearchResponse = {
  results?: ExaSearchResult[] | null;
};

type PerplexityResearch = {
  company_overview?: string;
  recent_news?: string | string[];
  metrics?: {
    employees?: number | string | null;
    revenue?: number | string | null;
    location?: string | null;
    industry?: string | null;
  } | null;
  linkedin?: string | null;
  email_draft?: string | null;
};

type ResearchOutput = {
  company_overview?: string;
  recent_news?: string | string[];
  metrics: {
    employees?: number | null;
    revenue?: number | null;
    location?: string | null;
    industry?: string | null;
  };
  linkedin?: string | null;
  fit_score: "Great Fit" | "Possible Fit" | "Poor Fit";
  reasoning: string;
};

type FitEvaluation = {
  fitScore: "Great Fit" | "Possible Fit" | "Poor Fit";
  probability: number;
  reasoning: string;
  criteria: {
    geography: boolean;
    employeeCount: boolean;
    revenueRange: boolean;
    seniorContact: boolean;
  };
};

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return createErrorResponse(405, "Method not allowed");
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const perplexityApiKey = Deno.env.get("PERPLEXITY_API_KEY");
    const exaApiKey = Deno.env.get("EXA_API_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new HttpError(500, "Supabase environment variables are not configured");
    }

    if (!perplexityApiKey) {
      throw new HttpError(500, "PERPLEXITY_API_KEY not configured");
    }

    if (!exaApiKey) {
      throw new HttpError(500, "EXA_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new HttpError(401, "Missing Authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new HttpError(401, "Unauthorized");
    }

    await assertUserRole(supabase, user.id);

    const rawBody = await req.json();
    const payload = RequestSchema.parse(rawBody);

    const client = await fetchClient(supabase, payload.client_id);
    const contact = payload.contact_id 
      ? await fetchContact(supabase, payload.contact_id, payload.client_id)
      : null;

    const dealId = await resolveDealId(supabase, payload.deal_id, payload.client_id);

    console.log(`[lead-research-evaluate] Mode: ${contact ? "Contact Evaluation" : "Company Research Only"}`);

    const exaResearch = await fetchExaResearch(exaApiKey, payload.company, payload.website ?? client.website ?? null);
    const perplexityResearch = await fetchPerplexityResearch(
      perplexityApiKey,
      payload.company,
      payload.website ?? client.website ?? null,
      exaResearch,
      contact,
    );

    const research = mergeResearch(exaResearch, perplexityResearch);
    
    let fitEvaluation: FitEvaluation;
    if (contact) {
      fitEvaluation = evaluateFit(research.metrics, research.linkedin ?? null, contact.position);
      research.fit_score = fitEvaluation.fitScore;
      research.reasoning = fitEvaluation.reasoning;
    } else {
      fitEvaluation = {
        fitScore: "Possible Fit",
        probability: 50,
        reasoning: "Company research completed - no contact evaluated yet",
        criteria: {
          geography: false,
          employeeCount: false,
          revenueRange: false,
          seniorContact: false,
        },
      };
      research.fit_score = "Possible Fit";
      research.reasoning = "Company research completed - add a contact to evaluate fit";
    }

    if (contact) {
      await updateDealFit(supabase, dealId, fitEvaluation);
    }
    await updateClientProfile(supabase, client.id, research.metrics);

    const generatedTasks =
      contact && fitEvaluation.fitScore === "Great Fit" && perplexityResearch.email_draft
        ? [
            {
              type: "email_draft",
              subject: `Warm outreach for ${payload.company}`,
              body: perplexityResearch.email_draft,
            },
          ]
        : null;

    const executionContext: Record<string, string> = {
      deal_id: dealId,
      client_id: payload.client_id,
      mode: contact ? "contact_evaluation" : "company_research",
    };
    
    if (payload.contact_id) {
      executionContext.contact_id = payload.contact_id;
    }

    const { data: runRecord } = await supabase
      .from("ai_agent_runs")
      .insert({
        title: contact ? `Lead evaluation for ${payload.company}` : `Company research for ${payload.company}`,
        category: "lead_evaluation",
        status: "completed",
        executed_by: user.id,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        input: payload as unknown as Json,
        output: {
          research,
          fit_summary: fitEvaluation.reasoning,
        } as Json,
        generated_tasks: generatedTasks as unknown as Json,
        execution_context: executionContext as Json,
      })
      .select("id")
      .single();

    return createJsonResponse({
      success: true,
      deal_id: dealId,
      run_id: runRecord?.id ?? null,
      research,
      fit: {
        score: fitEvaluation.fitScore,
        probability: fitEvaluation.probability,
        reasoning: fitEvaluation.reasoning,
      },
    });
  } catch (error) {
    console.error("[lead-research-evaluate]", error);
    if (error instanceof HttpError) {
      return createErrorResponse(error.status, error.message);
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return createErrorResponse(500, message);
  }
});

function createJsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function createErrorResponse(status: number, message: string) {
  return createJsonResponse({ error: message }, status);
}

async function assertUserRole(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, "Unable to verify user permissions");
  }

  const role = (data as { role?: string } | null)?.role ?? null;
  if (!role || !["super_admin", "manager", "bd_user"].includes(role)) {
    throw new HttpError(403, "Insufficient permissions");
  }
}

async function fetchClient(client: SupabaseClient, clientId: string): Promise<ClientRow> {
  const { data, error } = await client
    .from("clients")
    .select("id, name, company, website")
    .eq("id", clientId)
    .maybeSingle();

  if (error) {
    console.error("[lead-research-evaluate] Failed to load client", error);
    throw new HttpError(500, "Failed to load client");
  }

  if (!data) {
    throw new HttpError(404, "Client not found");
  }

  return data as ClientRow;
}

async function fetchContact(client: SupabaseClient, contactId: string, clientId: string): Promise<ContactRow> {
  const { data, error } = await client
    .from("contacts")
    .select("id, client_id, first_name, last_name, email, phone, position")
    .eq("id", contactId)
    .maybeSingle();

  if (error) {
    console.error("[lead-research-evaluate] Failed to load contact", error);
    throw new HttpError(500, "Failed to load contact");
  }

  if (!data) {
    throw new HttpError(404, "Contact not found");
  }

  const contact = data as ContactRow;
  if (contact.client_id && contact.client_id !== clientId) {
    throw new HttpError(400, "Contact does not belong to the specified client");
  }

  return contact;
}

async function resolveDealId(client: SupabaseClient, dealId: string | undefined, clientId: string): Promise<string> {
  if (dealId) {
    return dealId;
  }

  const { data, error } = await client
    .from("deals")
    .select("id")
    .eq("client_id", clientId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[lead-research-evaluate] Failed to resolve deal", error);
    throw new HttpError(500, "Failed to resolve deal");
  }

  if (!data) {
    throw new HttpError(404, "Deal not found for client");
  }

  return (data as { id: string }).id;
}

async function fetchExaResearch(apiKey: string, company: string, website: string | null): Promise<ExaResearch> {
  const exa = new Exa(apiKey);
  const domain = website ? extractDomain(website) : null;
  const queryParts = [`${company} company overview`, `${company} funding and size`, `${company} headquarters`];
  if (domain) {
    queryParts.push(`site:${domain}`);
  }

  const query = queryParts.join(" OR ");

  const searchOptions = {
    numResults: 5,
    type: "auto" as const,
    text: true,
    highlights: { numSentences: 2 },
  };

  let response: ExaSearchResponse | null = null;
  try {
    response = (await exa.searchAndContents(query, searchOptions as any)) as ExaSearchResponse;
  } catch (error) {
    console.error("[lead-research-evaluate] Exa search failed", error);
    throw new HttpError(502, "Failed to fetch research data");
  }

  const results: ExaSearchResult[] = Array.isArray(response?.results)
    ? (response?.results as ExaSearchResult[])
    : [];
  const summaries = results.slice(0, 5).map((result) => {
    const highlightText = Array.isArray(result?.highlights)
      ? result.highlights
          ?.map((highlight) => highlight?.text ?? "")
          .filter((text): text is string => Boolean(text))
          .join(" ")
      : typeof result?.text === "string"
      ? result.text
      : "";
    return {
      title: result?.title,
      url: result?.url,
      snippet: highlightText,
    };
  });

  const linkedinUrl = results
    .map((result) => result?.url ?? undefined)
    .find((url) => typeof url === "string" && url.toLowerCase().includes("linkedin.com/company")) ?? null;

  const context = summaries
    .filter((item) => item.title || item.snippet)
    .map((item) => `${item.title ? `${item.title}: ` : ""}${item.snippet}`.trim())
    .join("\n\n");

  return {
    context,
    linkedin: linkedinUrl,
  };
}

async function fetchPerplexityResearch(
  apiKey: string,
  company: string,
  website: string | null,
  exaResearch: ExaResearch,
  contact: ContactRow | null,
): Promise<PerplexityResearch> {
  const prompt = buildPerplexityPrompt(company, website, exaResearch, contact);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          {
            role: "system",
            content: "You are a sales research analyst who delivers concise, factual summaries.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 800,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const text = await response.text();
      console.error("[lead-research-evaluate] Perplexity API error", response.status, text);
      throw new HttpError(502, "Failed to generate AI research");
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new HttpError(502, "Unexpected response from Perplexity");
    }

    return parsePerplexityJson(content);
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof HttpError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new HttpError(504, "Perplexity request timed out");
    }

    console.error("[lead-research-evaluate] Perplexity fetch failed", error);
    throw new HttpError(502, "Failed to generate AI research");
  }
}

function buildPerplexityPrompt(
  company: string,
  website: string | null,
  exaResearch: ExaResearch,
  contact: ContactRow | null,
) {
  if (!contact) {
    // Company-only research mode
    const instructions = {
      task: "Provide a concise company briefing",
      required_fields: {
        company_overview: "2-3 sentence overview focusing on offerings and market",
        recent_news: "Key developments in the last 12 months",
        metrics: {
          employees: "Approximate employee count as a number",
          revenue: "Annual revenue in USD as a number",
          location: "Primary operating geography",
          industry: "Primary industry or sector",
        },
        linkedin: "Official LinkedIn company profile URL if available",
      },
      formatting: "Return ONLY valid JSON with the fields above.",
    };

    const contextSections = [
      `Company: ${company}`,
      website ? `Website: ${website}` : null,
      exaResearch.linkedin ? `LinkedIn from research: ${exaResearch.linkedin}` : null,
      exaResearch.context ? `Supporting research snippets:\n${exaResearch.context}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    return `${contextSections}\n\nInstructions:\n${JSON.stringify(instructions, null, 2)}`;
  }

  // Contact evaluation mode
  const contactName = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Unknown contact";
  const position = contact.position ? ` (${contact.position})` : "";

  const instructions = {
    task: "Provide a concise company briefing and outreach context",
    required_fields: {
      company_overview: "2-3 sentence overview focusing on offerings and market",
      recent_news: "Key developments in the last 12 months",
      metrics: {
        employees: "Approximate employee count as a number",
        revenue: "Annual revenue in USD as a number",
        location: "Primary operating geography",
        industry: "Primary industry or sector",
      },
      linkedin: "Official LinkedIn company profile URL if available",
      email_draft:
        "Short personalized outreach email (4-6 sentences) tailored to the contact and findings. Use a friendly but professional tone.",
    },
    formatting: "Return ONLY valid JSON with the fields above.",
  };

  const contextSections = [
    `Company: ${company}`,
    website ? `Website: ${website}` : null,
    `Primary contact: ${contactName}${position}`,
    exaResearch.linkedin ? `LinkedIn from research: ${exaResearch.linkedin}` : null,
    exaResearch.context ? `Supporting research snippets:\n${exaResearch.context}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  return `${contextSections}\n\nInstructions:\n${JSON.stringify(instructions, null, 2)}`;
}

function parsePerplexityJson(content: string): PerplexityResearch {
  const cleaned = stripJsonCodeFence(content.trim());
  try {
    const parsed = JSON.parse(cleaned);
    return parsed as PerplexityResearch;
  } catch (error) {
    console.error("[lead-research-evaluate] Failed to parse Perplexity JSON", error, content);
    throw new HttpError(502, "Perplexity response was not valid JSON");
  }
}

function stripJsonCodeFence(raw: string): string {
  if (!raw.startsWith("```") || raw.indexOf("\n") === -1) {
    return raw;
  }

  const fenceEnd = raw.lastIndexOf("```");
  const withoutFence = fenceEnd > 0 ? raw.slice(raw.indexOf("\n") + 1, fenceEnd) : raw;
  return withoutFence.trim();
}

function mergeResearch(exa: ExaResearch, perplexity: PerplexityResearch): ResearchOutput {
  const metrics = normalizeMetrics(perplexity.metrics ?? {});

  const recentNews = Array.isArray(perplexity.recent_news)
    ? perplexity.recent_news
    : typeof perplexity.recent_news === "string"
    ? perplexity.recent_news
    : undefined;

  return {
    company_overview: perplexity.company_overview,
    recent_news: recentNews,
    metrics,
    linkedin: perplexity.linkedin || exa.linkedin || null,
    fit_score: "Possible Fit",
    reasoning: "Fit not yet evaluated",
  };
}

function normalizeMetrics(raw: Record<string, unknown>): ResearchOutput["metrics"] {
  const employees = parseEmployeeCount(raw.employees ?? raw["employee_count"]);
  const revenue = parseRevenue(raw.revenue ?? raw["annual_revenue"]);
  const location = typeof raw.location === "string" ? raw.location : typeof raw["headquarters"] === "string" ? (raw["headquarters"] as string) : null;
  const industry = typeof raw.industry === "string" ? raw.industry : null;

  return {
    employees,
    revenue,
    location,
    industry,
  };
}

function parseEmployeeCount(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.round(value) : null;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/[,+]/g, "").trim();
    const match = cleaned.match(/(\d+(?:\.\d+)?)([kKmM])?/);
    if (!match) return null;
    const base = Number.parseFloat(match[1]);
    if (!Number.isFinite(base)) return null;
    const multiplier = match[2]
      ? match[2].toLowerCase() === "m"
        ? 1_000_000
        : 1_000
      : 1;
    return Math.round(base * multiplier);
  }

  return null;
}

function parseRevenue(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.round(value) : null;
  }

  if (typeof value === "string") {
    const lower = value.toLowerCase();
    const multiplier = lower.includes("b")
      ? 1_000_000_000
      : lower.includes("m")
      ? 1_000_000
      : lower.includes("k")
      ? 1_000
      : 1;
    const numeric = Number.parseFloat(lower.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(numeric)) {
      return null;
    }
    return Math.round(numeric * multiplier);
  }

  return null;
}

function evaluateFit(metrics: ResearchOutput["metrics"], linkedin: string | null, position: string | null): FitEvaluation {
  const geography = typeof metrics.location === "string" && metrics.location.toLowerCase().includes("united states");
  const employeeCount = typeof metrics.employees === "number" && metrics.employees > 50;
  const revenueRange = typeof metrics.revenue === "number" && metrics.revenue >= 10_000_000 && metrics.revenue <= 500_000_000;
  const seniorContact = isSeniorRole(position);

  const matches = [geography, employeeCount, revenueRange, seniorContact].filter(Boolean).length;

  let fitScore: FitEvaluation["fitScore"];
  let probability: number;

  if (matches === 4) {
    fitScore = "Great Fit";
    probability = 90;
  } else if (matches >= 2) {
    fitScore = "Possible Fit";
    probability = 60;
  } else {
    fitScore = "Poor Fit";
    probability = 20;
  }

  const reasons: string[] = [];
  reasons.push(geography ? "Operates in the United States" : "Outside target geography");
  reasons.push(employeeCount ? "Meets employee threshold" : "Employee count below threshold");
  reasons.push(revenueRange ? "Revenue within target band" : "Revenue outside target band");
  reasons.push(seniorContact ? "Contact is VP-level or higher" : "Contact seniority uncertain");

  const reasoning = reasons.join("; ");

  return {
    fitScore,
    probability,
    reasoning,
    criteria: {
      geography,
      employeeCount,
      revenueRange,
      seniorContact,
    },
  };
}

function isSeniorRole(position: string | null): boolean {
  if (!position) return false;
  const normalized = position.toLowerCase();
  return /vp|vice\s+president|chief|c[eo]|founder|president|head\b/.test(normalized);
}

async function updateDealFit(client: SupabaseClient, dealId: string, evaluation: FitEvaluation) {
  const { error } = await client
    .from("deals")
    .update({
      status: evaluation.fitScore,
      probability: evaluation.probability,
      updated_at: new Date().toISOString(),
    })
    .eq("id", dealId);

  if (error) {
    console.error("[lead-research-evaluate] Failed to update deal", error);
    throw new HttpError(500, "Failed to update deal");
  }
}

async function updateClientProfile(client: SupabaseClient, clientId: string, metrics: ResearchOutput["metrics"]) {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof metrics.industry === "string" && metrics.industry.length > 0) {
    updates.industry = metrics.industry;
  }

  if (typeof metrics.revenue === "number") {
    updates.revenue = metrics.revenue;
  }

  if (typeof metrics.employees === "number") {
    updates.employee_count = metrics.employees;
  }

  if (Object.keys(updates).length === 1) {
    return;
  }

  const { error } = await client.from("clients").update(updates).eq("id", clientId);
  if (error) {
    console.error("[lead-research-evaluate] Failed to update client", error);
    throw new HttpError(500, "Failed to update client profile");
  }
}

function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname;
  } catch (_error) {
    return null;
  }
}

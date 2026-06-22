import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

import { corsHeaders } from "../_shared/cors.ts";
import { ensureCampaignKpis } from "../_shared/campaignKpis.ts";
import { insertAnalyticsMetrics, type AnalyticsMetricInput } from "../_shared/analytics.ts";
import { resolveCampaignTaskSeeds } from "../_shared/campaignTasks.ts";

const CampaignTypeSchema = z.enum([
  "email_outbound",
  "linkedin_outbound",
  "cold_calling",
  "abm",
  "other",
]);

const CampaignStatusSchema = z.enum([
  "planning",
  "active",
  "paused",
  "completed",
  "archived",
]);

const CampaignBaseSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  niche_id: z.string().uuid(),
  brand_id: z.string().uuid().nullable().optional(),
  campaign_type: CampaignTypeSchema,
  campaign_types: z.array(CampaignTypeSchema).optional(),
  status: CampaignStatusSchema.optional(),
  ghl_campaign_id: z.string().nullable().optional(),
  linkedin_campaign_id: z.string().nullable().optional(),
  ai_agent_id: z.string().nullable().optional(),
  content_template: z.unknown().nullable().optional(),
  research_data: z.record(z.unknown()).nullable().optional(),
  linkedin_stats: z.record(z.unknown()).nullable().optional(),
  ghl_stats: z.record(z.unknown()).nullable().optional(),
  contacts_summary: z.unknown().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  target_contacts: z.array(z.string()).nullable().optional(),
  target_regions: z.array(z.string()).nullable().optional(),
  target_contacts_count: z.number().int().nonnegative().nullable().optional(),
  actual_contacts_reached: z.number().int().nonnegative().nullable().optional(),
  responses_received: z.number().int().nonnegative().nullable().optional(),
  meetings_booked: z.number().int().nonnegative().nullable().optional(),
  deals_generated: z.number().int().nonnegative().nullable().optional(),
  owned_by: z.string().uuid().nullable().optional(),
  created_by: z.string().uuid().nullable().optional(),
});

const CampaignInsertSchema = CampaignBaseSchema.pick({
  name: true,
  niche_id: true,
  brand_id: true,
  campaign_type: true,
  campaign_types: true,
  status: true,
  ghl_campaign_id: true,
  linkedin_campaign_id: true,
  ai_agent_id: true,
  content_template: true,
  research_data: true,
  linkedin_stats: true,
  ghl_stats: true,
  contacts_summary: true,
  start_date: true,
  end_date: true,
  target_contacts: true,
  target_regions: true,
  target_contacts_count: true,
  actual_contacts_reached: true,
  responses_received: true,
  meetings_booked: true,
  deals_generated: true,
  owned_by: true,
}).extend({
  created_by: z.string().uuid().nullable().optional(),
  brand_ids: z.array(z.string().uuid()).optional(),
});

const CampaignUpdateSchema = CampaignInsertSchema.partial();

const MetricPayloadSchema = z.object({
  metric_name: z.string().min(1),
  metric_value: z.number(),
  source: z.string().optional(),
  recorded_at: z.string().optional(),
  dimensions: z.record(z.unknown()).optional(),
});

const TaskSeedSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  status: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  dueInDays: z.number().int().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
});

const CreateRequestSchema = z.object({
  campaign: CampaignInsertSchema,
  options: z
    .object({
      seedKpis: z.boolean().optional(),
      taskTemplateKey: z.string().optional(),
      tasks: z.array(TaskSeedSchema).optional(),
    })
    .optional(),
});

const UpdateRequestSchema = z.object({
  campaign: CampaignUpdateSchema.optional(),
  metrics: z.array(MetricPayloadSchema).optional(),
  options: z
    .object({
      seedKpis: z.boolean().optional(),
      taskTemplateKey: z.string().optional(),
      tasks: z.array(TaskSeedSchema).optional(),
    })
    .optional(),
});

interface HydratedCampaign {
  id: string;
  name: string;
  niche_id: string;
  brand_id: string | null;
  brand_ids?: string[];
  brands?: BrandRow[];
  campaign_type: string;
  campaign_types?: string[];
  status: string;
  ghl_campaign_id: string | null;
  linkedin_campaign_id: string | null;
  ai_agent_id: string | null;
  content_template: unknown;
  research_data: Record<string, unknown> | null;
  linkedin_stats: Record<string, unknown> | null;
  ghl_stats: Record<string, unknown> | null;
  contacts_summary: unknown;
  start_date: string | null;
  end_date: string | null;
  target_contacts: string[] | null;
  target_regions: string[] | null;
  target_contacts_count: number | null;
  actual_contacts_reached: number | null;
  responses_received: number | null;
  meetings_booked: number | null;
  emails_sent?: number | null;
  linkedin_requests_sent?: number | null;
  deals_generated: number | null;
  owned_by: string | null;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
  brand?: BrandRow | null;
  owner?: ProfileRow | null;
  creator?: ProfileRow | null;
  kpis?: KpiRow[];
  analytics_summary?: AnalyticsSummary[];
}

interface CampaignDatabaseRow {
  id: string;
  name: string;
  niche_id: string;
  brand_id: string | null;
  campaign_type: string;
  campaign_types?: string[];
  status: string;
  ghl_campaign_id: string | null;
  linkedin_campaign_id: string | null;
  ai_agent_id: string | null;
  content_template: unknown;
  research_data: Record<string, unknown> | null;
  linkedin_stats: Record<string, unknown> | null;
  ghl_stats: Record<string, unknown> | null;
  contacts_summary: unknown;
  start_date: string | null;
  end_date: string | null;
  target_contacts: string[] | null;
  target_regions: string[] | null;
  target_contacts_count: number | null;
  actual_contacts_reached: number | null;
  responses_received: number | null;
  meetings_booked: number | null;
  deals_generated: number | null;
  owned_by: string | null;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
}

interface BrandRow {
  id: string;
  name: string | null;
  slug: string | null;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface KpiRow {
  id: string;
  project_id: string;
  name: string;
  current_value: number | null;
  target_value: number | null;
  unit: string | null;
  description: string | null;
  updated_at?: string;
}

interface AnalyticsRow {
  id: string;
  metric_name: string;
  metric_value: number | null;
  recorded_at: string | null;
  dimensions: Record<string, unknown> | null;
}

interface AnalyticsSummary {
  metric_name: string;
  total_value: number;
  last_recorded_at: string | null;
}

interface ProjectTaskRow {
  id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  assigned_to: string | null;
  due_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
}

async function createSupabaseClient(req: Request): Promise<SupabaseClient> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase credentials are not configured");
  }

  // Use service role key to bypass RLS
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}

async function createUserClient(req: Request): Promise<SupabaseClient> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase credentials are not configured");
  }

  // Use anon key with user's JWT for authentication
  return createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
}

async function requireUser(client: SupabaseClient, authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error("Unauthorized");
  }
  
  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await client.auth.getClaims(token);
  
  if (error || !data?.claims) {
    throw new Error("Unauthorized");
  }
  
  // Return a user-like object with the claims
  return {
    id: data.claims.sub as string,
    email: data.claims.email as string | undefined,
    role: data.claims.role as string | undefined,
  };
}

async function checkUserRole(serviceClient: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  
  if (error || !data) {
    return null;
  }
  
  return data.role;
}

// Helper to resolve either a UUID or slug to the campaign's actual UUID
async function resolveCampaignIdOrSlug(
  client: SupabaseClient,
  idOrSlug: string
): Promise<{ id: string; owned_by: string | null; created_by: string | null } | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  
  let query = client
    .from("bd_campaigns")
    .select("id, owned_by, created_by");
  
  if (isUuid) {
    query = query.eq("id", idOrSlug);
  } else {
    query = query.eq("slug", idOrSlug);
  }
  
  const { data, error } = await query.maybeSingle();
  
  if (error || !data) {
    return null;
  }
  
  return data;
}

async function canUpdateCampaign(
  serviceClient: SupabaseClient,
  campaignIdOrSlug: string,
  userId: string
): Promise<{ allowed: boolean; resolvedId: string | null }> {
  // Resolve slug to UUID first
  const campaign = await resolveCampaignIdOrSlug(serviceClient, campaignIdOrSlug);
  
  if (!campaign) {
    return { allowed: false, resolvedId: null };
  }
  
  // Get user's role
  const role = await checkUserRole(serviceClient, userId);
  
  // Super admins and admins can update any campaign
  if (role === "super_admin" || role === "admin") {
    return { allowed: true, resolvedId: campaign.id };
  }
  
  // Otherwise, check if user is the owner or creator
  const isOwnerOrCreator = campaign.owned_by === userId || campaign.created_by === userId;
  
  return { allowed: isOwnerOrCreator, resolvedId: campaign.id };
}

function parseRoute(url: URL) {
  const segments = url.pathname.split("/").filter(Boolean);
  const anchorIndex = segments.indexOf("admin-campaigns");
  if (anchorIndex === -1) {
    return segments;
  }

  return segments.slice(anchorIndex + 1);
}

async function fetchRelatedMaps(client: SupabaseClient, campaigns: CampaignDatabaseRow[]) {
  const brandIds = new Set<string>();
  const profileIds = new Set<string>();

  for (const campaign of campaigns) {
    if (campaign.brand_id) {
      brandIds.add(campaign.brand_id);
    }
    if (campaign.owned_by) {
      profileIds.add(campaign.owned_by);
    }
    if (campaign.created_by) {
      profileIds.add(campaign.created_by);
    }
  }

  const campaignIds = campaigns.map((c) => c.id);

  const [brandsRes, campaignBrandsRes, profilesRes] = await Promise.all([
    brandIds.size > 0
      ? client.from("brands").select("id, name, slug").in("id", Array.from(brandIds))
      : { data: [], error: null },
    client.from("campaign_brands").select("campaign_id, brand_id, clients!inner(id, name, slug)").in("campaign_id", campaignIds),
    profileIds.size > 0
      ? client.from("profiles").select("id, full_name, email, avatar_url").in("id", Array.from(profileIds))
      : { data: [], error: null },
  ]);

  const brandMap = new Map<string, BrandRow>();
  if (!brandsRes.error && brandsRes.data) {
    for (const brand of brandsRes.data as BrandRow[]) {
      brandMap.set(brand.id, brand);
    }
  }

  const campaignBrandsMap = new Map<string, string[]>();
  if (!campaignBrandsRes.error && campaignBrandsRes.data) {
    for (const cb of campaignBrandsRes.data) {
      const arr = campaignBrandsMap.get(cb.campaign_id) || [];
      arr.push(cb.brand_id);
      campaignBrandsMap.set(cb.campaign_id, arr);
      // Handle joined client data (Supabase returns it as object, not array)
      const clientData = cb.clients as unknown as { id: string; name: string | null; slug: string | null } | null;
      if (clientData && clientData.id) {
        brandMap.set(clientData.id, clientData as BrandRow);
      }
    }
  }

  const profileMap = new Map<string, ProfileRow>();
  if (!profilesRes.error && profilesRes.data) {
    for (const profile of profilesRes.data as ProfileRow[]) {
      profileMap.set(profile.id, profile);
    }
  }

  const kpiMap = new Map<string, KpiRow[]>();
  const analyticsMap = new Map<string, AnalyticsSummary[]>();

  return { brandMap, campaignBrandsMap, profileMap, kpiMap, analyticsMap };
}

function summarizeAnalytics(rows: AnalyticsRow[]): AnalyticsSummary[] {
  const metrics = new Map<string, AnalyticsSummary>();

  for (const row of rows) {
    const name = row.metric_name as string;
    const value = Number(row.metric_value ?? 0);
    const recordedAt = typeof row.recorded_at === "string" ? row.recorded_at : null;
    const current = metrics.get(name) ?? { metric_name: name, total_value: 0, last_recorded_at: null };
    current.total_value += Number.isFinite(value) ? value : 0;

    if (recordedAt && (!current.last_recorded_at || new Date(recordedAt) > new Date(current.last_recorded_at))) {
      current.last_recorded_at = recordedAt;
    }

    metrics.set(name, current);
  }

  return Array.from(metrics.values());
}

async function calculateCampaignStats(
  client: SupabaseClient,
  campaignId: string
): Promise<{
  total_contacts: number;
  researched: number;
  connected: number;
  responded: number;
  meetings_booked: number;
  emails_sent: number;
  linkedin_requests_sent: number;
}> {
  try {
    const { data: contacts, error } = await client
      .from("campaign_contacts")
      .select("id, status")
      .eq("campaign_id", campaignId);

    if (error || !contacts) {
      return {
        total_contacts: 0,
        researched: 0,
        connected: 0,
        responded: 0,
        meetings_booked: 0,
        emails_sent: 0,
        linkedin_requests_sent: 0,
      };
    }

    const contactIds = contacts.map((contact) => contact.id).filter(Boolean);

    const stats = {
      total_contacts: contacts.length,
      researched: contacts.filter((c: { status: string }) => c.status === "researched").length,
      connected: contacts.filter((c: { status: string }) => c.status === "connected").length,
      responded: contacts.filter((c: { status: string }) => c.status === "responded").length,
      meetings_booked: contacts.filter((c: { status: string }) => c.status === "meeting_booked").length,
      emails_sent: 0,
      linkedin_requests_sent: 0,
    };

    const { count: directEmailsCount, error: directEmailsError } = await client
      .from("campaign_emails")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .not("sent_at", "is", null);

    if (!directEmailsError) {
      stats.emails_sent += directEmailsCount ?? 0;
    }

    if (contactIds.length > 0) {
      const { data: enrollments, error: enrollmentsError } = await client
        .from("contact_sequence_enrollments")
        .select("total_sent")
        .in("contact_id", contactIds);

      if (!enrollmentsError && enrollments) {
        stats.emails_sent += enrollments.reduce((sum, enrollment) => sum + (enrollment.total_sent ?? 0), 0);
      }
    }

    const { count: linkedinRequestsCount, error: linkedinRequestsError } = await client
      .from("campaign_contact_linkedin_messages")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("message_type", "connection_request")
      .not("sent_at", "is", null);

    if (!linkedinRequestsError) {
      stats.linkedin_requests_sent = linkedinRequestsCount ?? 0;
    }

    return stats;
  } catch (error) {
    console.error(`[admin-campaigns] Error calculating stats for campaign ${campaignId}:`, error);
    return {
      total_contacts: 0,
      researched: 0,
      connected: 0,
      responded: 0,
      meetings_booked: 0,
      emails_sent: 0,
      linkedin_requests_sent: 0,
    };
  }
}

async function hydrateCampaigns(
  client: SupabaseClient,
  campaigns: CampaignDatabaseRow[],
): Promise<HydratedCampaign[]> {
  if (campaigns.length === 0) {
    return [];
  }

  const baseCampaigns = campaigns.map((campaign) => ({ ...campaign }));
  const { brandMap, campaignBrandsMap, profileMap } = await fetchRelatedMaps(client, baseCampaigns);

  // Calculate stats for all campaigns in parallel
  const statsPromises = baseCampaigns.map(campaign => 
    calculateCampaignStats(client, campaign.id)
  );
  const allStats = await Promise.all(statsPromises);

  return baseCampaigns.map((campaign, index) => {
    const brandIds = campaignBrandsMap.get(campaign.id) || [];
    const stats = allStats[index];
    const ghlStats = (campaign.ghl_stats ?? null) as Record<string, unknown> | null;
    const ghlEmailsSent = ghlStats && typeof ghlStats.emails_sent === "number" ? ghlStats.emails_sent : 0;
    const totalEmailsSent = stats.emails_sent + ghlEmailsSent;
    
    return {
      ...campaign,
      // Override with calculated values from actual contacts
      actual_contacts_reached: stats.total_contacts,
      responses_received: stats.responded,
      meetings_booked: stats.meetings_booked,
      emails_sent: totalEmailsSent,
      linkedin_requests_sent: stats.linkedin_requests_sent,
      // Keep target_contacts_count as is - this is the goal
      brand_ids: brandIds,
      brands: brandIds.map(id => brandMap.get(id)).filter((b): b is BrandRow => !!b),
      brand: campaign.brand_id ? brandMap.get(campaign.brand_id) ?? null : null,
      owner: campaign.owned_by ? profileMap.get(campaign.owned_by) ?? null : null,
      creator: campaign.created_by ? profileMap.get(campaign.created_by) ?? null : null,
      kpis: [],
      analytics_summary: [],
    };
  });
}

async function handleList(req: Request, client: SupabaseClient) {
  const url = new URL(req.url);
  const page = Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1;
  const pageSize = Number.parseInt(url.searchParams.get("pageSize") ?? "20", 10) || 20;
  const status = url.searchParams.get("status");
  const nicheId = url.searchParams.get("nicheId");
  const ownerId = url.searchParams.get("ownerId");
  const brandId = url.searchParams.get("brandId");
  const search = url.searchParams.get("search");
  const includeArchived = url.searchParams.get("includeArchived") === "true";

  let query = client
    .from("bd_campaigns")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (!includeArchived) {
    query = query.neq("status", "archived");
  }

  if (status) {
    query = query.eq("status", status);
  }
  if (nicheId) {
    query = query.eq("niche_id", nicheId);
  }
  if (ownerId) {
    query = query.eq("owned_by", ownerId);
  }
  if (brandId) {
    query = query.eq("brand_id", brandId);
  }
  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) {
    throw error;
  }

  const hydrated = await hydrateCampaigns(client, (data ?? []) as CampaignDatabaseRow[]);

  return {
    data: hydrated,
    total: count ?? hydrated.length,
    page,
    pageSize,
  };
}

async function handleGet(client: SupabaseClient, idOrSlug: string) {
  // Check if it's a UUID or slug
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  
  let query = client
    .from("bd_campaigns")
    .select("*");
  
  if (isUuid) {
    query = query.eq("id", idOrSlug);
  } else {
    query = query.eq("slug", idOrSlug);
  }
  
  const { data, error } = await query.maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const campaignId = data.id;
  const [campaign] = await hydrateCampaigns(client, [data as CampaignDatabaseRow]);

  let tasks: ProjectTaskRow[] = [];
  try {
    const { data: taskRows, error: taskError } = await client
      .from("project_tasks")
      .select(
        "id, project_id, title, description, status, priority, assigned_to, due_date, created_at, updated_at, completed_at, estimated_hours, actual_hours",
      )
      .eq("project_id", campaignId)
      .order("due_date", { ascending: true, nullsFirst: false });
    if (!taskError && taskRows) {
      tasks = taskRows as ProjectTaskRow[];
    }
  } catch (error) {
    if ((error as { code?: string }).code !== "42P01") {
      console.warn("[admin-campaigns] Unable to load project tasks", error);
    }
  }

  // Fetch contacts for detail view
  let contacts: Array<Record<string, unknown>> = [];
  try {
    const { data: contactRows, error: contactError } = await client
      .from("campaign_contacts")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false });
    if (!contactError && contactRows) {
      contacts = contactRows as Array<Record<string, unknown>>;
    }
  } catch (error) {
    console.warn("[admin-campaigns] Unable to load campaign contacts", error);
  }

  return {
    campaign,
    tasks,
    contacts,
    activities: [],
  };
}

async function handleCreate(req: Request, client: SupabaseClient, userId: string) {
  const payload = CreateRequestSchema.parse(await req.json());
  const { campaign: campaignInput, options } = payload;

  const brandIds = campaignInput.brand_ids || (campaignInput.brand_id ? [campaignInput.brand_id] : []);

  // Ensure campaign_types is set, with fallback to campaign_type for backwards compatibility
  const campaignTypes = campaignInput.campaign_types && campaignInput.campaign_types.length > 0
    ? campaignInput.campaign_types
    : [campaignInput.campaign_type];

  const now = new Date().toISOString();
  const insertPayload = {
    ...campaignInput,
    brand_id: brandIds[0] || null,
    campaign_type: campaignTypes[0], // Store first type in legacy field for backwards compatibility
    campaign_types: campaignTypes, // Store all types in array field
    status: campaignInput.status ?? "planning",
    created_by: campaignInput.created_by ?? userId,
    owned_by: campaignInput.owned_by ?? userId,
    created_at: now,
    updated_at: now,
  };
  delete insertPayload.brand_ids;

  const { data, error } = await client
    .from("bd_campaigns")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  if (brandIds.length > 0) {
    const brandRelations = brandIds.map(brand_id => ({
      campaign_id: data.id,
      brand_id,
    }));
    await client.from("campaign_brands").insert(brandRelations);
  }

  // Seed KPIs if requested (wrapped in try-catch to not block campaign creation)
  try {
    await ensureCampaignKpis(client, data.id, { seedIfMissing: options?.seedKpis ?? false });
  } catch (error) {
    console.warn('[admin-campaigns] KPI seeding failed, continuing:', error);
  }

  if (options?.taskTemplateKey || (options?.tasks?.length ?? 0) > 0) {
    try {
      const taskSeeds = resolveCampaignTaskSeeds({
        templateKey: options?.taskTemplateKey,
        customTasks: options?.tasks,
        startDate: campaignInput.start_date ?? null,
      });

      if (taskSeeds.length > 0) {
        const rows = taskSeeds.map((task) => ({
          ...task,
          project_id: data.id,
          created_by: userId,
          status: task.status ?? "todo",
        }));

        const { error: taskError } = await client.from("project_tasks").insert(rows);
        if (taskError) {
          if ((taskError as { code?: string }).code === '23503') {
            console.warn('[admin-campaigns] Cannot seed tasks due to FK constraint, skipping');
          } else if ((taskError as { code?: string }).code !== "42P01") {
            console.error("[admin-campaigns] Error seeding project_tasks:", taskError);
          }
        }
      }
    } catch (error) {
      console.warn('[admin-campaigns] Failed to seed project tasks, continuing:', error);
    }
  }

  const [campaign] = await hydrateCampaigns(client, [data as CampaignDatabaseRow]);
  return campaign;
}

async function handleUpdate(
  req: Request,
  client: SupabaseClient,
  campaignIdOrSlug: string,
  userId: string,
) {
  // Resolve slug to UUID and check authorization
  const { allowed, resolvedId } = await canUpdateCampaign(client, campaignIdOrSlug, userId);
  
  if (!resolvedId) {
    throw new Error("Campaign not found");
  }
  
  if (!allowed) {
    throw new Error("You do not have permission to update this campaign");
  }

  // Use the resolved UUID for all subsequent operations
  const campaignId = resolvedId;

  const payload = UpdateRequestSchema.parse(await req.json());
  const { campaign: updates = {}, metrics = [], options } = payload;

  const { data: existing, error: fetchError } = await client
    .from("bd_campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (!existing) {
    throw new Error("Campaign not found");
  }

  const brandIds = updates.brand_ids;
  if (brandIds !== undefined) {
    await client.from("campaign_brands").delete().eq("campaign_id", campaignId);
    if (brandIds.length > 0) {
      const brandRelations = brandIds.map(brand_id => ({
        campaign_id: campaignId,
        brand_id,
      }));
      await client.from("campaign_brands").insert(brandRelations);
      updates.brand_id = brandIds[0];
    } else {
      updates.brand_id = null;
    }
    delete updates.brand_ids;
  }

  // Ensure campaign_types and campaign_type are in sync
  if (updates.campaign_types && updates.campaign_types.length > 0) {
    // If campaign_types is provided, update campaign_type to first value for backwards compatibility
    updates.campaign_type = updates.campaign_types[0];
  } else if (updates.campaign_type && !updates.campaign_types) {
    // If only campaign_type is provided, ensure campaign_types is updated too
    updates.campaign_types = [updates.campaign_type];
  }

  const previousStatus = existing.status as string | null;
  const nextStatus = updates.status ?? previousStatus ?? "planning";

  const updatePayload = {
    ...updates,
    updated_at: new Date().toISOString(),
  } as Record<string, unknown>;

  if (updates.created_by) {
    delete updatePayload.created_by;
  }

  const { data, error } = await client
    .from("bd_campaigns")
    .update(updatePayload)
    .eq("id", campaignId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  if (metrics.length > 0) {
    const analyticsPayload: AnalyticsMetricInput[] = metrics.map((metric) => ({
      ...metric,
      dimensions: { ...(metric.dimensions ?? {}), campaign_id: campaignId },
    }));
    await insertAnalyticsMetrics(client, analyticsPayload, { defaultSource: "bd_campaign" });
  }

  if (options?.seedKpis) {
    await ensureCampaignKpis(client, campaignId, { seedIfMissing: true });
  }

  if (previousStatus !== "completed" && nextStatus === "completed") {
    await triggerCompletionSummary(client, data as CampaignDatabaseRow, userId, metrics);
  }

  const [campaign] = await hydrateCampaigns(client, [data as CampaignDatabaseRow]);
  return campaign;
}

async function triggerCompletionSummary(
  client: SupabaseClient,
  campaign: CampaignDatabaseRow,
  userId: string,
  metrics: AnalyticsMetricInput[],
) {
  try {
    const agentId = campaign.ai_agent_id ?? Deno.env.get("BD_CAMPAIGN_SUMMARY_AGENT_ID");
    if (!agentId) {
      return;
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return;
    }

    const executionContext = {
      campaign_id: campaign.id,
      campaign_name: campaign.name,
      status: campaign.status,
      timeframe: campaign.start_date && campaign.end_date
        ? `${campaign.start_date} - ${campaign.end_date}`
        : undefined,
      metrics: {
        target_contacts_count: campaign.target_contacts_count,
        actual_contacts_reached: campaign.actual_contacts_reached,
        responses_received: campaign.responses_received,
        meetings_booked: campaign.meetings_booked,
        deals_generated: campaign.deals_generated,
        additional: metrics,
      },
    };

    const response = await fetch(`${supabaseUrl}/functions/v1/run-ai-agent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({
        agent_id: agentId,
        execution_context: executionContext,
        user_context: `Campaign ${campaign.name} has been completed. Summarize outcomes and next steps.`,
      }),
    });

    if (!response.ok) {
      console.warn("[admin-campaigns] AI summary generation failed", response.status, await response.text());
      return;
    }

    const aiData = await response.json();
    const researchData = typeof campaign.research_data === "object" && campaign.research_data !== null
      ? { ...campaign.research_data }
      : {};

    researchData.completion_summary = {
      generated_at: new Date().toISOString(),
      summary: aiData?.summary ?? null,
      findings: aiData?.findings ?? [],
      recommendations: aiData?.recommendations ?? [],
      action_items: aiData?.action_items ?? [],
      raw: aiData,
    };

    await client
      .from("bd_campaigns")
      .update({ research_data: researchData })
      .eq("id", campaign.id);
  } catch (error) {
    console.warn("[admin-campaigns] Failed to trigger completion summary", error);
  }
}

async function handleDelete(client: SupabaseClient, campaignIdOrSlug: string) {
  // Resolve slug to UUID first
  const campaign = await resolveCampaignIdOrSlug(client, campaignIdOrSlug);
  
  if (!campaign) {
    throw new Error("Campaign not found");
  }

  const { data, error } = await client
    .from("bd_campaigns")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", campaign.id)
    .select("id, status")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    
    // Use user client for authentication
    const userClient = await createUserClient(req);
    const user = await requireUser(userClient, authHeader);
    
    // Use service role client for database operations (bypasses RLS)
    const serviceClient = await createSupabaseClient(req);
    
    const url = new URL(req.url);
    const segments = parseRoute(url);

    if (req.method === "GET" && segments[0] === "list") {
      const payload = await handleList(req, serviceClient);
      return jsonResponse(payload);
    }

    if (req.method === "GET" && segments.length === 1) {
      const campaignId = segments[0];
      const payload = await handleGet(serviceClient, campaignId);
      if (!payload) {
        return jsonResponse({ error: "Campaign not found" }, 404);
      }
      return jsonResponse(payload);
    }

    if (req.method === "POST" && segments.length === 0) {
      const campaign = await handleCreate(req, serviceClient, user.id);
      return jsonResponse({ campaign }, 201);
    }

    if (req.method === "PUT" && segments.length === 1) {
      const campaignId = segments[0];
      const campaign = await handleUpdate(req, serviceClient, campaignId, user.id);
      return jsonResponse({ campaign });
    }

    if (req.method === "DELETE" && segments.length === 1) {
      const campaignId = segments[0];
      const data = await handleDelete(serviceClient, campaignId);
      return jsonResponse({ success: true, data });
    }

    return jsonResponse({ error: "Not found" }, 404);
  } catch (error) {
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : 
                   error instanceof Error && error.message === "Campaign not found" ? 404 :
                   error instanceof Error && error.message.includes("permission") ? 403 : 400;
    console.error("[admin-campaigns] Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

export interface CampaignKpiTemplate {
  name: string;
  description: string;
  unit?: string | null;
  targetValue?: number | null;
  initialValue?: number | null;
}

export const DEFAULT_CAMPAIGN_KPI_TEMPLATES: CampaignKpiTemplate[] = [
  {
    name: "Actual Contacts Reached",
    description: "Number of prospects that received at least one outbound touchpoint.",
    unit: "contacts",
    targetValue: null,
    initialValue: 0,
  },
  {
    name: "Responses Received",
    description: "Responses or replies captured across outbound channels.",
    unit: "responses",
    targetValue: null,
    initialValue: 0,
  },
  {
    name: "Meetings Booked",
    description: "Qualified meetings scheduled as a result of the campaign.",
    unit: "meetings",
    targetValue: null,
    initialValue: 0,
  },
  {
    name: "Deals Generated",
    description: "Opportunities created from this campaign.",
    unit: "deals",
    targetValue: null,
    initialValue: 0,
  },
];

interface EnsureOptions {
  kpis?: CampaignKpiTemplate[];
  seedIfMissing?: boolean;
}

export async function ensureCampaignKpis(
  client: SupabaseClient,
  campaignId: string,
  options: EnsureOptions = {},
): Promise<void> {
  if (!options.seedIfMissing) {
    return;
  }

  try {
    // Check if campaign_kpis table exists and has data
    const { data: existingKpis, error: checkError } = await client
      .from("campaign_kpis")
      .select("id")
      .eq("campaign_id", campaignId);

    if (checkError) {
      if ((checkError as { code?: string }).code === '42P01') {
        // Table doesn't exist, skip KPI seeding
        console.log('[campaignKpis] campaign_kpis table not found, skipping');
        return;
      }
      throw checkError;
    }

    if (existingKpis && existingKpis.length > 0) {
      return; // Already has KPIs
    }

    // Insert default KPIs
    const templates = options.kpis || DEFAULT_CAMPAIGN_KPI_TEMPLATES;
    const rows = templates.map((template) => ({
      campaign_id: campaignId,
      name: template.name,
      description: template.description,
      unit: template.unit ?? null,
      target_value: template.targetValue ?? null,
      current_value: template.initialValue ?? 0,
    }));

    const { error: insertError } = await client.from("campaign_kpis").insert(rows);
    if (insertError) {
      console.error("[campaignKpis] Failed to insert KPIs:", insertError);
      throw insertError;
    }
  } catch (error) {
    // Log but don't throw - KPI seeding shouldn't block campaign creation
    console.error('[campaignKpis] Failed to seed KPIs:', error);
  }
}

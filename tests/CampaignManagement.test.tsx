import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, test, mock } from "bun:test";
import type { BDCampaign } from "@/hooks/useBDCampaigns";

let useBDCampaignsReturn: any = {};
function useBDCampaignsMock(..._args: unknown[]) {
  return useBDCampaignsReturn;
}

let useTargetNichesReturn: any = { niches: [] };
function useTargetNichesMock(..._args: unknown[]) {
  return useTargetNichesReturn;
}

mock.module("@/hooks/useBDCampaigns", () => ({
  useBDCampaigns: (...args: unknown[]) => useBDCampaignsMock(...args),
}));

mock.module("@/hooks/useTargetNiches", () => ({
  useTargetNiches: (...args: unknown[]) => useTargetNichesMock(...args),
}));

mock.module("@/components/bd/CampaignDialog", () => ({
  CampaignDialog: () => <div data-testid="campaign-dialog" />,
}));

const CampaignManagementModule = await import("@/pages/bd/CampaignManagement");
const CampaignManagement = CampaignManagementModule.default;

describe("CampaignManagement", () => {
  beforeEach(() => {
    useTargetNichesReturn = { niches: [] };
    useBDCampaignsReturn = {
      campaigns: [],
      total: 0,
      isLoading: false,
      error: null,
      refetch: () => {},
      createCampaign: {},
      updateCampaign: {},
      deleteCampaign: {},
    };
  });

  function renderComponent() {
    return renderToStaticMarkup(
      <MemoryRouter>
        <CampaignManagement />
      </MemoryRouter>,
    );
  }

  function getMetricValue(html: string, label: string) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`${escaped}[\\s\\S]*?<div class=\\"text-2xl font-bold\\">(.*?)<\\/div>`);
    const match = html.match(regex);
    if (!match) {
      throw new Error(`Metric ${label} not found in markup`);
    }
    return match[1];
  }

  test("renders campaign metrics and cards", () => {
    const campaigns: BDCampaign[] = [
      {
        id: "cmp-1",
        name: "LinkedIn Blitz",
        niche_id: "n1",
        brand_id: null,
        campaign_type: "email_outbound",
        status: "active",
        ghl_campaign_id: "ghl-1",
        linkedin_campaign_id: "ln-1",
        ai_agent_id: "agent-1",
        content_template: null,
        research_data: { contacts_researched: 30 },
        linkedin_stats: {
          requests_sent: 100,
          connections_accepted: 40,
          messages_sent: 20,
          responses_received: 5,
        },
        ghl_stats: {
          emails_sent: 200,
          replies: 4,
        },
        contacts_summary: null,
        metadata: null,
        start_date: null,
        end_date: null,
        target_contacts: null,
        target_regions: null,
        target_contacts_count: 100,
        actual_contacts_reached: 50,
        responses_received: 2,
        meetings_booked: 3,
        deals_generated: 1,
        owned_by: null,
        created_by: null,
        created_at: "",
        updated_at: "",
        brand: null,
        owner: null,
        creator: null,
        kpis: [],
        analytics_summary: [],
      },
      {
        id: "cmp-2",
        name: "Email Warmup",
        niche_id: "n2",
        brand_id: null,
        campaign_type: "linkedin_outbound",
        status: "planning",
        ghl_campaign_id: null,
        linkedin_campaign_id: null,
        ai_agent_id: null,
        content_template: null,
        research_data: {},
        linkedin_stats: {
          requests_sent: 50,
          connections_accepted: 10,
          messages_sent: 5,
          responses_received: 2,
        },
        ghl_stats: {
          emails_sent: 80,
          replies: 1,
        },
        contacts_summary: null,
        metadata: null,
        start_date: null,
        end_date: null,
        target_contacts: null,
        target_regions: null,
        target_contacts_count: 40,
        actual_contacts_reached: 20,
        responses_received: 1,
        meetings_booked: 1,
        deals_generated: 0,
        owned_by: null,
        created_by: null,
        created_at: "",
        updated_at: "",
        brand: null,
        owner: null,
        creator: null,
        kpis: [],
        analytics_summary: [],
      },
    ];

    useTargetNichesReturn = { niches: [
      { id: "n1", name: "Healthcare" },
      { id: "n2", name: "SaaS" },
    ] };

    useBDCampaignsReturn = {
      campaigns,
      total: campaigns.length,
      isLoading: false,
      error: null,
      refetch: () => {},
      createCampaign: {},
      updateCampaign: {},
      deleteCampaign: {},
    };

    const html = renderComponent();

    expect(html).toContain("Campaign Management");
    expect(getMetricValue(html, "Total Campaigns")).toBe("2");
    expect(getMetricValue(html, "Active Campaigns")).toBe("1");
    expect(getMetricValue(html, "Total Responses")).toBe("15");
    expect(html).toContain("LinkedIn Blitz");
    expect(html).toContain("Healthcare");
    expect(html).toContain("Email Warmup");
    expect(html).toContain("SaaS");
  });

  test("renders error state when hook fails", () => {
    useBDCampaignsReturn = {
      campaigns: [],
      total: 0,
      isLoading: false,
      error: new Error("supabase timeout"),
      refetch: () => {},
      createCampaign: {},
      updateCampaign: {},
      deleteCampaign: {},
    };

    const html = renderComponent();

    expect(html).toContain("Unable to load campaigns");
    expect(html).toContain("supabase timeout");
    expect(html).toContain("Try again");
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, mock } from "bun:test";
import type { CampaignListResponse, CampaignSummary } from "@/Api/adminCampaigns";

const listCampaignsCalls: Array<Record<string, unknown>> = [];
let listCampaignsImpl: (args: Record<string, unknown>) => CampaignListResponse = () => ({
  data: [],
  total: 0,
  page: 1,
  pageSize: 12,
});

function listCampaignsMock(args: Record<string, unknown>) {
  listCampaignsCalls.push(args);
  return listCampaignsImpl(args);
}

const queryClientStub = {
  cancelQueries: async () => {},
  getQueryData: () => undefined,
  setQueryData: () => {},
  invalidateQueries: async () => {},
};

mock.module("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    const [, params] = queryKey as [string, { nicheId?: string; page: number; limit: number }];
    try {
      const data = listCampaignsMock({ nicheId: params?.nicheId, page: params?.page, pageSize: params?.limit });
      return { data, isLoading: false, error: undefined, refetch: async () => data };
    } catch (error) {
      return { data: undefined, isLoading: false, error, refetch: async () => { throw error; } };
    }
  },
  useMutation: () => ({ mutate: () => {}, mutateAsync: async () => {}, isPending: false }),
  useQueryClient: () => queryClientStub,
}));

mock.module("@/Api/adminCampaigns", () => ({
  listCampaigns: (args: Record<string, unknown>) => listCampaignsMock(args),
  createCampaign: () => {
    throw new Error("createCampaign mock not implemented");
  },
  updateCampaign: () => {
    throw new Error("updateCampaign mock not implemented");
  },
  archiveCampaign: () => {
    throw new Error("archiveCampaign mock not implemented");
  },
}));

mock.module("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: () => {} }),
}));

const { useBDCampaigns } = await import("@/hooks/useBDCampaigns");
type HookState = ReturnType<typeof useBDCampaigns>;

describe("useBDCampaigns", () => {
  beforeEach(() => {
    listCampaignsCalls.length = 0;
    listCampaignsImpl = () => ({ data: [], total: 0, page: 1, pageSize: 12 });
  });

  function runHook(): HookState {
    let state: HookState | null = null;
    function HookHarness() {
      state = useBDCampaigns(undefined, 1, 12);
      return null;
    }
    renderToStaticMarkup(<HookHarness />);
    if (!state) throw new Error("Hook state not captured");
    return state;
  }

  test("fetches campaigns successfully", () => {
    const campaigns: CampaignSummary[] = [
      {
        id: "cmp-1",
        name: "Outbound Push",
        niche_id: "niche-1",
        brand_id: null,
        campaign_type: "email_outbound",
        status: "active",
        ghl_campaign_id: null,
        linkedin_campaign_id: "ln-1",
        ai_agent_id: null,
        content_template: null,
        research_data: {},
        linkedin_stats: {},
        ghl_stats: {},
        contacts_summary: null,
        metadata: null,
        start_date: null,
        end_date: null,
        target_contacts: null,
        target_regions: null,
        target_contacts_count: 50,
        actual_contacts_reached: 25,
        responses_received: 5,
        meetings_booked: 2,
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
    ];

    listCampaignsImpl = () => ({
      data: campaigns,
      total: 1,
      page: 1,
      pageSize: 12,
    });

    const state = runHook();

    expect(state.isLoading).toBe(false);
    expect(state.campaigns).toEqual(campaigns);
    expect(state.total).toBe(1);
    expect(typeof state.refetch).toBe("function");
    expect(listCampaignsCalls.at(-1)).toEqual({ nicheId: undefined, page: 1, pageSize: 12 });
  });

  test("handles errors from listCampaigns", () => {
    const error = new Error("Failed to load");
    listCampaignsImpl = () => {
      throw error;
    };

    const state = runHook();

    expect(state.isLoading).toBe(false);
    expect(state.error).toBe(error);
    expect(state.campaigns).toEqual([]);
    expect(state.total).toBe(0);
  });
});

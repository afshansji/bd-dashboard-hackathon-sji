import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Deal, DealStage } from '@/types/business-opportunities';
import { useToast } from '@/hooks/use-toast';

export const boDealKeys = {
  all: ['bo-deals'] as const,
  lists: () => [...boDealKeys.all, 'list'] as const,
  list: (filters?: BODealFilters) => [...boDealKeys.lists(), filters] as const,
  stats: () => [...boDealKeys.all, 'stats'] as const,
};

export interface BODealFilters {
  search?: string;
  dealstage?: string | string[];
  stage?: DealStage | 'all';
  stages?: DealStage[];
  owner?: string;
  bdRepId?: string;
  client?: string;
  client_id?: string;
  hasClientId?: boolean;
  excludeLost?: boolean;
  excludeClosed?: boolean;
  amountMin?: number;
  amountMax?: number;
  dateFrom?: Date;
  dateTo?: Date;
  expectedCloseDateBefore?: Date;
  expectedCloseDateAfter?: Date;
  daysInStageMin?: number;
  daysInStageMax?: number;
  sortBy?: 'deal_name' | 'value' | 'expected_close_date' | 'created_at' | 'updated_at' | 'stage';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface PaginatedDeals {
  deals: Deal[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface BODealStats {
  totalDeals: number;
  totalValue: number;
  avgProbability: number;
  weightedValue: number;
  byStage: Record<string, { count: number; value: number }>;
}

function transformDealFromDB(data: any): Deal {
  const transformed: any = { ...data };

  // Map joined clients data
  if (transformed.clients && typeof transformed.clients === 'object' && transformed.clients.name) {
    transformed.client = transformed.clients;
  }

  // Ensure deal_name falls back to title
  if (!transformed.deal_name && transformed.title) {
    transformed.deal_name = transformed.title;
  }

  // Ensure value falls back to amount
  if (transformed.value == null && transformed.amount != null) {
    transformed.value = transformed.amount;
  }

  return transformed as Deal;
}

async function fetchBODeals(filters?: BODealFilters): Promise<PaginatedDeals> {
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('deals')
    .select(`
      id, deal_name, title, slug, stage, value, amount, probability,
      expected_close_date, owner, actual_deal_owner_email, actual_deal_owner_name, actual_deal_owner_id,
      client_id, client, clientemail, clientcompanyname,
      days_in_stage, created_at, created_date, updated_at,
      hubspot_deal_id, bd_rep_id, lovable_url, pod_assigned, dealtype, lead_source, category,
      clients:client_id(id, name, slug, status, industry)
    `, { count: 'exact' })
    .is('deleted_at', null)
    .order(filters?.sortBy || 'updated_at', { ascending: filters?.sortOrder === 'asc' });

  // Apply stage filters
  if (filters?.stages && filters.stages.length > 0) {
    query = query.in('stage', filters.stages);
  } else if (filters?.dealstage) {
    if (Array.isArray(filters.dealstage)) {
      query = query.in('stage', filters.dealstage);
    } else {
      query = query.eq('stage', filters.dealstage);
    }
  } else if (filters?.stage && filters.stage !== 'all') {
    query = query.eq('stage', filters.stage);
  }

  // Apply owner filter
  if (filters?.owner && filters?.owner !== 'all') {
    query = query.eq('actual_deal_owner_email', filters.owner);
  }

  // Apply BD Rep filter
  if (filters?.bdRepId && filters?.bdRepId !== 'all') {
    if (filters.bdRepId === 'unassigned') {
      query = query.is('bd_rep_id', null);
    } else {
      query = query.eq('bd_rep_id', filters.bdRepId);
    }
  }

  // Apply lost deals exclusion
  if (filters?.excludeLost) {
    query = query.neq('stage', 'lost');
  }

  // Apply closed deals exclusion (won + lost + accepted)
  if (filters?.excludeClosed) {
    query = query.not('stage', 'in', '("won","lost","accepted")');
  }

  // Apply client filters
  if (filters?.hasClientId !== undefined) {
    if (filters.hasClientId) {
      query = query.not('client_id', 'is', null);
    } else {
      query = query.is('client_id', null);
    }
  } else if (filters?.client_id) {
    query = query.eq('client_id', filters.client_id);
  }

  // Apply search filter
  if (filters?.search) {
    const escapedSearch = filters.search.replace(/[%_\\]/g, '\\$&');
    query = query.or(`deal_name.ilike.%${escapedSearch}%,title.ilike.%${escapedSearch}%,client.ilike.%${escapedSearch}%,owner.ilike.%${escapedSearch}%`);
  }

  // Apply amount range
  if (filters?.amountMin !== undefined) query = query.gte('value', filters.amountMin);
  if (filters?.amountMax !== undefined) query = query.lte('value', filters.amountMax);

  // Apply close date
  if (filters?.expectedCloseDateBefore) query = query.lte('expected_close_date', filters.expectedCloseDateBefore.toISOString());
  if (filters?.expectedCloseDateAfter) query = query.gte('expected_close_date', filters.expectedCloseDateAfter.toISOString());

  // Apply days in stage
  if (filters?.daysInStageMin !== undefined) query = query.gte('days_in_stage', filters.daysInStageMin);
  if (filters?.daysInStageMax !== undefined) query = query.lte('days_in_stage', filters.daysInStageMax);

  // Apply date range
  if (filters?.dateFrom) query = query.gte('created_at', filters.dateFrom.toISOString());
  if (filters?.dateTo) query = query.lte('created_at', filters.dateTo.toISOString());

  query = query.range(from, to);
  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching deals:', error);
    throw new Error(error.message);
  }

  return {
    deals: (data || []).map(d => transformDealFromDB(d)),
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export function useBODeals(filters?: BODealFilters) {
  return useQuery({
    queryKey: boDealKeys.list(filters),
    queryFn: () => fetchBODeals(filters),
    staleTime: 1000 * 60 * 5,
    placeholderData: (previousData) => previousData,
  });
}

export function useBODealStats() {
  return useQuery({
    queryKey: boDealKeys.stats(),
    queryFn: async (): Promise<BODealStats> => {
      const { data: deals, error } = await supabase
        .from('deals')
        .select('stage, value, amount, probability')
        .is('deleted_at', null);

      if (error) throw new Error(error.message);

      const allDeals = deals || [];
      const totalDeals = allDeals.length;
      const totalValue = allDeals.reduce((sum, d) => sum + (d.value || d.amount || 0), 0);
      const avgProbability = totalDeals > 0
        ? allDeals.reduce((sum, d) => sum + (d.probability || 0), 0) / totalDeals
        : 0;
      const weightedValue = allDeals.reduce(
        (sum, d) => sum + ((d.value || d.amount || 0) * (d.probability || 0) / 100), 0
      );

      const byStage: Record<string, { count: number; value: number }> = {};
      allDeals.forEach(d => {
        const stage = d.stage || 'unknown';
        if (!byStage[stage]) byStage[stage] = { count: 0, value: 0 };
        byStage[stage].count++;
        byStage[stage].value += d.value || d.amount || 0;
      });

      return { totalDeals, totalValue, avgProbability, weightedValue, byStage };
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateBODeal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Record<string, any> }) => {
      const { data, error } = await supabase
        .from('deals')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boDealKeys.all });
      queryClient.invalidateQueries({ queryKey: ['deal-stage-counts'] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteBODeal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('deals')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boDealKeys.all });
      queryClient.invalidateQueries({ queryKey: ['deal-stage-counts'] });
      toast({ title: "Deal deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

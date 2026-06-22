import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Layers, ExternalLink } from "lucide-react";
import { useAllDeals } from "@/hooks/useAllDeals";
import { SyncControlTowerButton } from "@/components/bd/SyncControlTowerButton";
import { LastSyncDetails } from "@/components/bd/LastSyncDetails";
import { DealFilters, DealFiltersState } from "@/components/bd/DealFilters";
import { PipelineDataTable, Column } from "@/components/bd/PipelineDataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { LocalDealFilters } from "@/hooks/useDeals";

// Fetch users for filter dropdowns
function useUsers() {
  return useQuery({
    queryKey: ['users-for-filters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, status, title, department, created_at, updated_at')
        .order('first_name');
      if (error) throw error;
      // Map to AdminUser format with defaults for missing fields
      return (data || []).map(u => ({
        ...u,
        role: 'team_member' as const,
        status: (u.status || 'active') as 'active' | 'inactive' | 'pending',
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch PODs for filter dropdowns
function usePods() {
  return useQuery({
    queryKey: ['pods-for-filters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pods')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

const STAGE_LABELS: Record<string, string> = {
  prospecting: 'Lead',
  qualification: 'Estimation',
  proposal: 'Discovery',
  negotiation: 'Proposal Shared',
  new: 'New',
};

const STAGE_COLORS: Record<string, string> = {
  prospecting: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  qualification: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  proposal: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  negotiation: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  new: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

export default function AllDeals() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(25);
  const [filters, setFilters] = useState<DealFiltersState>({
    stages: [],
    statuses: [],
    ownerIds: [],
    pmIds: [],
    categories: [],
    dealTypes: [],
    podIds: [],
    dateFrom: undefined,
    dateTo: undefined,
    createdDateFrom: undefined,
    createdDateTo: undefined,
    search: '',
    syncedOnly: false,
    hideStaleDeals: false,
  });

  const { data: usersData } = useUsers();
  const { data: podsData } = usePods();

  // Convert DealFiltersState to LocalDealFilters
  const localFilters: LocalDealFilters = useMemo(() => ({
    stages: filters.stages,
    statuses: filters.statuses,
    ownerIds: filters.ownerIds,
    pmIds: filters.pmIds,
    categories: filters.categories,
    dealTypes: filters.dealTypes,
    podIds: filters.podIds,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    createdDateFrom: filters.createdDateFrom,
    createdDateTo: filters.createdDateTo,
    search: filters.search,
    syncedOnly: filters.syncedOnly,
    hideStaleDeals: filters.hideStaleDeals,
  }), [filters]);

  const { data, isLoading } = useAllDeals(currentPage, pageSize, localFilters);

  const handleFilterChange = useCallback((newFilters: DealFiltersState) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  const handleRowClick = useCallback((deal: any) => {
    if (deal.stage && deal.slug) {
      navigate(`/${deal.stage}/${deal.slug}`);
    }
  }, [navigate]);

  const columns: Column<any>[] = useMemo(() => [
    {
      key: 'deal_name',
      label: 'Deal Name',
      render: (value, row) => (
        <div className="font-medium">{value || '-'}</div>
      ),
    },
    {
      key: 'client_name',
      label: 'Client',
      render: (value, row) => (
        <div className="text-muted-foreground">{value}</div>
      ),
    },
    {
      key: 'value',
      label: 'Amount',
      render: (value) => (
        <div className="font-medium">
          {value ? `$${Number(value).toLocaleString()}` : '-'}
        </div>
      ),
    },
    {
      key: 'stage',
      label: 'Stage',
      render: (value) => (
        <Badge className={`${STAGE_COLORS[value] || 'bg-gray-100 text-gray-800'}`}>
          {STAGE_LABELS[value] || value || '-'}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <Badge variant="outline" className="capitalize">
          {value?.replace(/_/g, ' ') || '-'}
        </Badge>
      ),
    },
    {
      key: 'dealtype',
      label: 'Type',
      render: (value) => (
        <span className="capitalize text-muted-foreground">{value || '-'}</span>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      render: (value) => (
        <span className="capitalize text-muted-foreground">{value || '-'}</span>
      ),
    },
    {
      key: 'owner_name',
      label: 'Owner',
      render: (value) => (
        <span className="text-muted-foreground">{value}</span>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (value) => (
        <span className="text-muted-foreground">
          {value ? format(new Date(value), 'MMM d, yyyy') : '-'}
        </span>
      ),
    },
    {
      key: 'close_date',
      label: 'Close Date',
      render: (value) => (
        <span className="text-muted-foreground">
          {value ? format(new Date(value), 'MMM d, yyyy') : '-'}
        </span>
      ),
    },
    {
      key: 'pod_name',
      label: 'POD',
      render: (value) => (
        <span className="text-muted-foreground">{value}</span>
      ),
    },
    {
      key: 'lead_source',
      label: 'Source',
      render: (value) => (
        <span className="capitalize text-muted-foreground">{value}</span>
      ),
    },
  ], []);

  return (
    <div className="w-full px-6 md:px-8 lg:px-10 py-8 space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">All Deals</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            View and manage all deals across the pipeline
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <SyncControlTowerButton />
        </div>
      </div>

      <LastSyncDetails />

      <DealFilters
        filters={filters}
        onFiltersChange={handleFilterChange}
        owners={usersData || []}
        pms={usersData || []}
        categories={['retainer', 'project', 'consulting', 'other']}
        pods={podsData || []}
      />

      <PipelineDataTable
        data={data.data}
        columns={columns}
        isLoading={isLoading}
        searchable={false}
        totalCount={data.total}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onRowClick={handleRowClick}
        externalLinkFn={(row) => row.hubspot_crm_deal_url}
      />
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Grid, Search, Table as TableIcon } from "lucide-react";
import { formatCurrency, formatDecimal, getBestClientName } from "@/lib/utils";
import { useBODeals, type BODealFilters } from "@/hooks/useBusinessOpportunityDeals";
import type { DealStage } from "@/types/business-opportunities";
import { EnhancedDealCard } from "./EnhancedDealCard";
import { DealCardSkeleton } from "./DealCardSkeleton";
import { DealTableSkeleton } from "./DealTableSkeleton";
import { EnhancedPagination } from "./EnhancedPagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { SortableHeader } from "./SortableHeader";
import { OwnerDisplay } from "./OwnerDisplay";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/common/StatusBadge";

interface OwnerOption { owner: string; actual_deal_owner_name?: string; }

interface StageTabContentProps {
  stage: DealStage | 'all';
  stageLabel: string;
  viewMode: "card" | "table";
  safeFormatDate: (value?: string | null, fmt?: string) => string;
  onViewDetails: (slug: string) => void;
  owners: OwnerOption[];
  onViewModeChange: (mode: "card" | "table") => void;
}

export function StageTabContent({ stage, stageLabel, viewMode, safeFormatDate, onViewDetails, owners, onViewModeChange }: StageTabContentProps) {
  const [showClosedDeals, setShowClosedDeals] = useState(false);
  const [filters, setFilters] = useState<Partial<BODealFilters>>({
    stages: stage === 'all' ? undefined : [stage as DealStage],
    sortBy: "updated_at", sortOrder: "desc", page: 1, pageSize: 50, excludeClosed: true,
  });

  const numberFormatter = useMemo(() => new Intl.NumberFormat("en-US"), []);
  const uniqueOwners = useMemo(() => {
    return Array.from(new Set(owners.map(o => o.owner)))
      .map(ownerId => ({ id: ownerId, name: owners.find(o => o.owner === ownerId)?.actual_deal_owner_name || ownerId }))
      .filter(owner => Boolean(owner.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [owners]);

  useEffect(() => {
    setFilters(prev => ({ ...prev, stages: stage === 'all' ? undefined : [stage as DealStage], page: 1, search: undefined, owner: undefined, excludeClosed: !showClosedDeals }));
  }, [stage, showClosedDeals]);

  const { data, isLoading, error, refetch, isRefetching } = useBODeals(filters);
  const deals = data?.deals ?? [];
  const totalCount = data?.total ?? 0;
  const currentPage = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const sortBy = filters.sortBy ?? "updated_at";
  const sortOrder = filters.sortOrder ?? "desc";

  const handlePageChange = (page: number) => setFilters(prev => ({ ...prev, page }));
  const handlePageSizeChange = (nextPageSize: number) => setFilters(prev => ({ ...prev, page: 1, pageSize: nextPageSize }));
  const handleSort = (column: string) => {
    setFilters(prev => prev.sortBy === column ? { ...prev, sortOrder: prev.sortOrder === "asc" ? "desc" : "asc" } : { ...prev, sortBy: column as BODealFilters["sortBy"], sortOrder: "asc" });
  };
  const handleSearchChange = (value: string) => setFilters(prev => ({ ...prev, search: value || undefined, page: 1 }));
  const handleOwnerChange = (value: string) => setFilters(prev => ({ ...prev, owner: value === "all" ? undefined : value, page: 1 }));

  const totalValue = useMemo(() => deals.reduce((sum, deal) => sum + (deal.value || 0), 0), [deals]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-sm font-medium text-muted-foreground">{stageLabel} stage overview</p>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p className="text-2xl font-semibold">{numberFormatter.format(totalCount)} <span className="text-sm font-normal text-muted-foreground">{totalCount === 1 ? "deal" : "deals"}</span></p>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wide">Total Value</p><p className="text-xl font-semibold">{formatCurrency(totalValue)}</p></div>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder={`Search ${stageLabel.toLowerCase()} deals`} className="pl-9 pr-3 h-10" value={filters.search || ""} onChange={(e) => handleSearchChange(e.target.value)} />
          </div>
          <Select value={(filters.owner as string) || "all"} onValueChange={handleOwnerChange}>
            <SelectTrigger className="h-10 w-full md:w-[220px]"><SelectValue placeholder="All Owners" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Owners</SelectItem>{uniqueOwners.map(owner => (<SelectItem key={owner.id} value={owner.id}>{owner.name}</SelectItem>))}</SelectContent>
          </Select>
          <Button
            variant={showClosedDeals ? "default" : "outline"}
            size="sm"
            className="h-10 whitespace-nowrap"
            onClick={() => setShowClosedDeals(prev => !prev)}
          >
            {showClosedDeals ? "Hide Closed Deals" : "Show Closed Deals"}
          </Button>
        </div>
        <Select value={viewMode} onValueChange={(mode) => onViewModeChange(mode as "card" | "table")}>
          <SelectTrigger className="h-10 w-full md:w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="table"><div className="flex items-center gap-2"><TableIcon className="h-4 w-4" />Table</div></SelectItem>
            <SelectItem value="card"><div className="flex items-center gap-2"><Grid className="h-4 w-4" />Cards</div></SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-6 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <p className="font-semibold text-destructive">Failed to load deals</p>
          <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : "Unknown error"}</p>
          <Button variant="outline" onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      {!error && (
        <>
          <div className="rounded-2xl border bg-card/20 p-3">
            {isLoading || isRefetching ? (
              viewMode === "card" ? <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <DealCardSkeleton key={i} />)}</div> : <DealTableSkeleton rows={pageSize} />
            ) : deals.length === 0 ? (
              <div className="rounded-lg border bg-card p-8 text-center"><p className="font-medium">No deals in {stageLabel}</p><p className="text-sm text-muted-foreground">Deals will appear here once they enter this stage.</p></div>
            ) : viewMode === "card" ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{deals.map(deal => <EnhancedDealCard key={deal.id} deal={deal as any} onViewDetails={onViewDetails} />)}</div>
            ) : (
              <div className="rounded-lg border bg-card">
                <Table>
                  <TableHeader className="sticky top-0 z-20 bg-card">
                    <TableRow>
                      <SortableHeader column="deal_name" label="Deal Name" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                      <TableHead>Client</TableHead>
                      {stage === 'all' && <SortableHeader column="stage" label="Stage" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />}
                      <SortableHeader column="value" label="Amount" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                      <TableHead>Probability</TableHead>
                      <TableHead>Owner</TableHead>
                      <SortableHeader column="updated_at" label="Updated" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                      <SortableHeader column="expected_close_date" label="Close Date" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                      <SortableHeader column="created_at" label="Created Date" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deals.map(deal => (
                      <TableRow key={deal.id}>
                        <TableCell className="font-medium"><Link to={`/business-opportunities/deals/${deal.slug || deal.id}`} className="hover:underline">{deal.deal_name || deal.title}</Link></TableCell>
                        <TableCell>{(() => { const name = getBestClientName(deal); return name === "Unknown" ? "-" : name; })()}</TableCell>
                        {stage === 'all' && <TableCell><StatusBadge status={deal.stage || 'unknown'} /></TableCell>}
                        <TableCell className="font-mono">{formatCurrency(deal.value || 0)}</TableCell>
                        <TableCell><div className="flex items-center gap-2 min-w-[140px]"><Progress value={deal.probability || 0} className="h-2" /><span className="text-xs text-muted-foreground whitespace-nowrap">{formatDecimal(deal.probability || 0)}%</span></div></TableCell>
                        <TableCell><OwnerDisplay deal={deal} /></TableCell>
                        <TableCell><span className="text-sm text-muted-foreground">{safeFormatDate(deal.updated_at)}</span></TableCell>
                        <TableCell><span className="text-sm text-muted-foreground">{safeFormatDate(deal.expected_close_date)}</span></TableCell>
                        <TableCell><span className="text-sm text-muted-foreground">{safeFormatDate(deal.created_at)}</span></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          {deals.length > 0 && <EnhancedPagination currentPage={currentPage - 1} pageSize={pageSize} totalCount={totalCount} onPageChange={(page) => handlePageChange(page + 1)} onPageSizeChange={handlePageSizeChange} isLoading={isLoading} />}
        </>
      )}
    </div>
  );
}

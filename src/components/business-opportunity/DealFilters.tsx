import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X, SlidersHorizontal } from "lucide-react";
import type { BODealFilters } from "@/hooks/useBusinessOpportunityDeals";

interface DealFiltersProps {
  filters: BODealFilters;
  onFiltersChange: (filters: BODealFilters) => void;
  ownerOptions?: { value: string; label: string }[];
  showAdvanced?: boolean;
  onToggleAdvanced?: () => void;
}

export function DealFilters({
  filters,
  onFiltersChange,
  ownerOptions = [],
  showAdvanced,
  onToggleAdvanced,
}: DealFiltersProps) {
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value || undefined, page: 1 });
  };

  const handleOwnerChange = (value: string) => {
    onFiltersChange({ ...filters, owner: value === "all" ? undefined : value, page: 1 });
  };

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split("-") as [BODealFilters["sortBy"], "asc" | "desc"];
    onFiltersChange({ ...filters, sortBy, sortOrder, page: 1 });
  };

  const clearFilters = () => {
    onFiltersChange({ page: 1, pageSize: filters.pageSize });
  };

  const hasActiveFilters = !!(filters.search || filters.owner || filters.amountMin || filters.amountMax);

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search deals..."
          value={filters.search || ""}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {ownerOptions.length > 0 && (
        <Select value={filters.owner || "all"} onValueChange={handleOwnerChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Owners" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Owners</SelectItem>
            {ownerOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={`${filters.sortBy || "created_at"}-${filters.sortOrder || "desc"}`}
        onValueChange={handleSortChange}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="created_at-desc">Newest First</SelectItem>
          <SelectItem value="created_at-asc">Oldest First</SelectItem>
          <SelectItem value="value-desc">Highest Value</SelectItem>
          <SelectItem value="value-asc">Lowest Value</SelectItem>
          <SelectItem value="deal_name-asc">Name A-Z</SelectItem>
          <SelectItem value="deal_name-desc">Name Z-A</SelectItem>
          <SelectItem value="updated_at-desc">Recently Updated</SelectItem>
        </SelectContent>
      </Select>

      {onToggleAdvanced && (
        <Button variant="outline" size="sm" onClick={onToggleAdvanced}>
          <SlidersHorizontal className="h-4 w-4 mr-1" />
          Filters
        </Button>
      )}

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}

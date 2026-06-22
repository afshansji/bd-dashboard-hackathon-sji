import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import type { BODealFilters } from "@/hooks/useBusinessOpportunityDeals";

interface ActiveFilterChipsProps {
  filters: BODealFilters;
  onRemoveFilter: (key: keyof BODealFilters) => void;
}

export function ActiveFilterChips({ filters, onRemoveFilter }: ActiveFilterChipsProps) {
  const chips: { key: keyof BODealFilters; label: string }[] = [];

  if (filters.search) chips.push({ key: "search", label: `Search: "${filters.search}"` });
  if (filters.owner) chips.push({ key: "owner", label: `Owner: ${filters.owner}` });
  if (filters.amountMin) chips.push({ key: "amountMin", label: `Min: $${filters.amountMin.toLocaleString()}` });
  if (filters.amountMax) chips.push({ key: "amountMax", label: `Max: $${filters.amountMax.toLocaleString()}` });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <Badge key={chip.key} variant="secondary" className="gap-1 pr-1">
          {chip.label}
          <button
            onClick={() => onRemoveFilter(chip.key)}
            className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}

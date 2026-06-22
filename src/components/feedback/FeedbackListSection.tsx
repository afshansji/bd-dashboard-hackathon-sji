import { useMemo, useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FeedbackReport, FeedbackStatus } from "@/features/feedback/api";
import { FEEDBACK_STATUS_LABELS } from "@/features/feedback/constants";
import { FeedbackFilters } from "@/components/feedback/FeedbackFilters";
import { FeedbackListItem } from "@/components/feedback/FeedbackListItem";
import { usePagination } from "@/hooks/usePagination";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const STATUS_ORDER: FeedbackStatus[] = ["open", "in_review", "resolved", "closed"];
const ACTIVE_STATUSES: FeedbackStatus[] = ["open", "in_review"];

type TabKey = "bugs" | "features" | "all";

interface FeedbackListSectionProps {
  items: FeedbackReport[];
}

export function FeedbackListSection({ items }: FeedbackListSectionProps) {
  const [tab, setTab] = useState<TabKey>("bugs");
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "all">("all");
  const [moduleFilter, setModuleFilter] = useState<string | "all">("all");
  const pagination = usePagination(10);

  // Reset pagination when filters change
  useEffect(() => {
    pagination.reset();
  }, [tab, statusFilter, moduleFilter]);

  const moduleOptions = useMemo(() => {
    const modules = new Set<string>();
    items.forEach((item) => {
      if (item.module) {
        modules.add(item.module);
      }
    });
    return Array.from(modules).sort();
  }, [items]);

  // Filter items based on tab and filters
  // Bugs and Features tabs only show active items (open, in_review)
  // All tab shows everything
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Tab-based type filtering
      if (tab === "bugs" && item.type !== "bug") return false;
      if (tab === "features" && item.type !== "feature") return false;

      // For Bugs and Features tabs, only show active statuses
      if (tab !== "all" && !ACTIVE_STATUSES.includes(item.status)) {
        return false;
      }

      // Additional status filter (dropdown)
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      // Module filter
      if (moduleFilter !== "all" && item.module !== moduleFilter) {
        return false;
      }

      return true;
    });
  }, [items, moduleFilter, statusFilter, tab]);

  // Get statuses to display based on current tab
  const displayStatuses = useMemo(() => {
    return tab === "all" ? STATUS_ORDER : ACTIVE_STATUSES;
  }, [tab]);

  // Paginated items
  const paginatedItems = useMemo(() => {
    return filteredItems.slice(pagination.from, pagination.to + 1);
  }, [filteredItems, pagination.from, pagination.to]);

  const grouped = useMemo(() => {
    const map = new Map<FeedbackStatus, FeedbackReport[]>();
    displayStatuses.forEach((status) => map.set(status, []));
    paginatedItems.forEach((item) => {
      const bucket = map.get(item.status);
      if (bucket) bucket.push(item);
    });
    return map;
  }, [paginatedItems, displayStatuses]);

  // Counts for tabs - Bugs/Features show only active items count
  const counts = useMemo(() => {
    const activeBugs = items.filter(
      (item) => item.type === "bug" && ACTIVE_STATUSES.includes(item.status)
    ).length;
    const activeFeatures = items.filter(
      (item) => item.type === "feature" && ACTIVE_STATUSES.includes(item.status)
    ).length;
    return {
      bugs: activeBugs,
      features: activeFeatures,
      all: items.length,
    };
  }, [items]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredItems.length / pagination.pageSize);
  const showingFrom = filteredItems.length > 0 ? pagination.from + 1 : 0;
  const showingTo = Math.min(pagination.to + 1, filteredItems.length);

  // Generate page numbers to display
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, pagination.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [pagination.currentPage, totalPages]);

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(value) => setTab(value as TabKey)}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="bugs">Bugs ({counts.bugs})</TabsTrigger>
            <TabsTrigger value="features">Features ({counts.features})</TabsTrigger>
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          </TabsList>
          <FeedbackFilters
            status={statusFilter}
            module={moduleFilter}
            modules={moduleOptions}
            onStatusChange={setStatusFilter}
            onModuleChange={setModuleFilter}
          />
        </div>

        <TabsContent value={tab} className="mt-4 space-y-6">
          {displayStatuses.map((status) => {
            const entries = grouped.get(status) ?? [];
            if (entries.length === 0) return null;

            return (
              <div key={status} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    {FEEDBACK_STATUS_LABELS[status]}
                  </h3>
                  <span className="text-xs text-muted-foreground">{entries.length} items</span>
                </div>
                <div className="space-y-3">
                  {entries.map((item) => (
                    <FeedbackListItem key={item.id} item={item} />
                  ))}
                </div>
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No feedback matches the selected filters.
            </div>
          )}

          {/* Pagination */}
          {filteredItems.length > 0 && (
            <div className="flex flex-col items-center gap-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {showingFrom} to {showingTo} of {filteredItems.length} results
              </p>
              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => pagination.setCurrentPage(Math.max(1, pagination.currentPage - 1))}
                        className={pagination.currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    {pageNumbers.map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => pagination.setCurrentPage(page)}
                          isActive={page === pagination.currentPage}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => pagination.setCurrentPage(Math.min(totalPages, pagination.currentPage + 1))}
                        className={pagination.currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

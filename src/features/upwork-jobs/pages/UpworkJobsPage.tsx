import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart3, Briefcase, RefreshCw, Search } from "lucide-react";
import { useUpworkJobs } from "@/hooks/useUpworkJobs";
import { usePagination } from "@/hooks/usePagination";
import type { UpworkJobTypeFilter } from "../types";
import { UpworkJobCard } from "../components/UpworkJobCard";
import {
  LeadSourceFilter,
  type LeadSourceFilterValue,
} from "../components/LeadSourceFilter";
import {
  LeadTypeFilter,
  type LeadTypeFilterValue,
} from "../components/LeadTypeFilter";
import { EnhancedPagination } from "@/components/business-opportunity/EnhancedPagination";

export function UpworkJobsPage() {
  const [search, setSearch] = useState("");
  const [jobType, setJobType] = useState<UpworkJobTypeFilter>("all");
  const [source, setSource] = useState<LeadSourceFilterValue>("all");
  const [leadType, setLeadType] = useState<LeadTypeFilterValue>("all");
  const pagination = usePagination(50);

  useEffect(() => {
    pagination.reset();
  }, [search, jobType, source, leadType, pagination.reset]);

  const { data, isLoading, isError, error, refetch, isFetching } = useUpworkJobs({
    search,
    jobType: jobType === "all" ? undefined : jobType,
    source: source === "all" ? undefined : source,
    leadType: leadType === "all" ? undefined : leadType,
    page: pagination.currentPage,
    pageSize: pagination.pageSize,
  });

  const jobs = data?.jobs ?? [];
  const total = data?.total ?? 0;

  const jobCountLabel = useMemo(() => {
    if (total === 0) return "0 leads";
    if (total === 1) return "1 lead";

    const from = (pagination.currentPage - 1) * pagination.pageSize + 1;
    const to = Math.min(pagination.currentPage * pagination.pageSize, total);
    return `Showing ${from}-${to} of ${total} leads`;
  }, [pagination.currentPage, pagination.pageSize, total]);

  return (
    <div className="space-y-6 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Briefcase className="h-8 w-8 text-primary" />
            Job Leads
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            Leads imported from the Chrome extension across Upwork, Freelancer,
            Wellfound, Hacker News, LinkedIn, Reddit, X, and Facebook.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="transition-transform active:scale-[0.98]">
            <Link to="/bd/upwork-jobs/dashboard">
              <BarChart3 className="mr-2 h-4 w-4" />
              Job Board Dashboard
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="transition-transform active:scale-[0.98]"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title, description, skills..."
            className="pl-9"
          />
        </div>
        <LeadSourceFilter value={source} onChange={setSource} />
        <LeadTypeFilter value={leadType} onChange={setLeadType} />
        <Select
          value={jobType}
          onValueChange={(value) => setJobType(value as UpworkJobTypeFilter)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Job type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All job types</SelectItem>
            <SelectItem value="Hourly">Hourly</SelectItem>
            <SelectItem value="Fixed-price">Fixed-price</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-44 w-full rounded-lg" />
          ))}
        </div>
      ) : null}

      {isError ? (
        <Alert variant="destructive">
          <AlertTitle>Failed to load leads</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Unknown error"}
          </AlertDescription>
        </Alert>
      ) : null}

      {!isLoading && !isError && total === 0 ? (
        <Alert>
          <AlertTitle>No leads found</AlertTitle>
          <AlertDescription>
            {search || source !== "all" || leadType !== "all" || jobType !== "all"
              ? "Try adjusting your search or filters."
              : "Browse supported platforms in the Chrome extension and send leads to the backend. Configure the extension with your Supabase function URL and API key."}
          </AlertDescription>
        </Alert>
      ) : null}

      {!isLoading && !isError && jobs.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{jobCountLabel}</p>
          <div className="grid gap-4">
            {jobs.map((job) => (
              <UpworkJobCard key={job.id} job={job} />
            ))}
          </div>
          {total > pagination.pageSize ? (
            <EnhancedPagination
              currentPage={pagination.currentPage - 1}
              pageSize={pagination.pageSize}
              totalCount={total}
              onPageChange={(page) => pagination.setCurrentPage(page + 1)}
              onPageSizeChange={(size) => {
                pagination.setPageSize(size);
                pagination.reset();
              }}
              isLoading={isFetching}
              pageSizeOptions={[25, 50, 100, 200]}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

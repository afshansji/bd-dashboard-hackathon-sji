import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { UpworkJob } from "@/features/upwork-jobs/types";
import type { JobLeadSource, LeadType } from "@/features/upwork-jobs/constants/sources";

const UPWORK_LEGACY_SOURCES = ["upwork", "upwork_inspector", "upwork-inspector"] as const;

interface UseUpworkJobsOptions {
  search?: string;
  jobType?: string;
  source?: JobLeadSource;
  leadType?: LeadType;
  page?: number;
  pageSize?: number;
}

export interface UpworkJobsResult {
  jobs: UpworkJob[];
  total: number;
}

function escapeIlike(value: string): string {
  return value.replace(/[%_\\,]/g, (char) => `\\${char}`);
}

function applySourceFilter(
  query: ReturnType<typeof supabase.from>,
  source: JobLeadSource,
) {
  if (source === "upwork") {
    return query.in("source", [...UPWORK_LEGACY_SOURCES]);
  }

  return query.eq("source", source);
}

function buildUpworkJobsQuery(options: UseUpworkJobsOptions) {
  const { search = "", jobType, source, leadType } = options;

  let query = supabase
    .from("upwork_jobs")
    .select("*", { count: "exact" })
    .order("scraped_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (jobType && jobType !== "all") {
    query = query.eq("job_type", jobType);
  }

  if (source) {
    query = applySourceFilter(query, source);
  }

  if (leadType) {
    query = query.eq("lead_type", leadType);
  }

  const trimmedSearch = search.trim();
  if (trimmedSearch) {
    const term = escapeIlike(trimmedSearch);
    query = query.or(
      [
        `title.ilike.%${term}%`,
        `description.ilike.%${term}%`,
        `client_country.ilike.%${term}%`,
        `source.ilike.%${term}%`,
        `lead_type.ilike.%${term}%`,
      ].join(","),
    );
  }

  return query;
}

export function useUpworkJobs(options: UseUpworkJobsOptions = {}) {
  const {
    search = "",
    jobType,
    source,
    leadType,
    page = 1,
    pageSize = 50,
  } = options;

  return useQuery({
    queryKey: ["upwork-jobs", search, jobType, source, leadType, page, pageSize],
    queryFn: async (): Promise<UpworkJobsResult> => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const query = buildUpworkJobsQuery({ search, jobType, source, leadType }).range(
        from,
        to,
      );

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        jobs: (data ?? []) as UpworkJob[],
        total: count ?? 0,
      };
    },
    staleTime: 30_000,
  });
}

import type { JobLeadSource, LeadType } from "./constants/sources";

export interface UpworkJob {
  id: string;
  upwork_job_id: string | null;
  title: string;
  description: string;
  lead_type: LeadType | null;
  job_type: string | null;
  hourly_rate: string | null;
  fixed_budget: string | null;
  experience_level: string | null;
  project_length: string | null;
  weekly_hours: string | null;
  proposal_count: string | null;
  posted_time: string | null;
  payment_verified: boolean | null;
  client_rating: string | null;
  client_spent: string | null;
  client_country: string | null;
  client_hire_rate: string | null;
  client_total_jobs: string | null;
  client_company_size: string | null;
  skills: string[];
  attachments: unknown[];
  screening_questions: string[];
  job_url: string | null;
  scraped_at: string | null;
  content_hash: string | null;
  dedupe_key: string;
  source: JobLeadSource | string;
  created_at: string;
  updated_at: string;
}

/** @deprecated Use UpworkJob — table name retained for backward compatibility */
export type JobLead = UpworkJob;

export type UpworkJobTypeFilter = "all" | "Hourly" | "Fixed-price";

export type { JobLeadSource, LeadType };

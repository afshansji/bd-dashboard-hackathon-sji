-- Migration: Upwork Inspector job ingest storage
-- Chrome extension POSTs scraped jobs; BD team views them in the dashboard.

CREATE TABLE IF NOT EXISTS public.upwork_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  upwork_job_id VARCHAR(64),
  title VARCHAR(500) NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  job_type VARCHAR(50),
  hourly_rate VARCHAR(100),
  fixed_budget VARCHAR(100),
  experience_level VARCHAR(100),
  project_length VARCHAR(100),
  weekly_hours VARCHAR(100),
  proposal_count VARCHAR(100),
  posted_time VARCHAR(100),
  payment_verified BOOLEAN,
  client_rating VARCHAR(50),
  client_spent VARCHAR(100),
  client_country VARCHAR(100),
  client_hire_rate VARCHAR(50),
  client_total_jobs VARCHAR(50),
  client_company_size VARCHAR(100),
  skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  screening_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  job_url TEXT,
  scraped_at TIMESTAMPTZ,
  content_hash VARCHAR(64),
  dedupe_key TEXT NOT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'upwork_inspector',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT upwork_jobs_dedupe_key_unique UNIQUE (dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_upwork_jobs_scraped_at
  ON public.upwork_jobs(scraped_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_upwork_jobs_created_at
  ON public.upwork_jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_upwork_jobs_job_type
  ON public.upwork_jobs(job_type);

CREATE INDEX IF NOT EXISTS idx_upwork_jobs_client_country
  ON public.upwork_jobs(client_country);

CREATE UNIQUE INDEX IF NOT EXISTS idx_upwork_jobs_job_url_unique
  ON public.upwork_jobs(job_url)
  WHERE job_url IS NOT NULL AND job_url <> '';

ALTER TABLE public.upwork_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view upwork jobs"
  ON public.upwork_jobs
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_upwork_jobs_updated_at
  BEFORE UPDATE ON public.upwork_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

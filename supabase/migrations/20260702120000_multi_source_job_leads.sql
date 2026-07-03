-- Migration: Multi-source job leads from Chrome extension
-- Supports 8 platforms: upwork, freelancer, wellfound, hackernews, linkedin, reddit, twitter, facebook

ALTER TABLE public.upwork_jobs
  ADD COLUMN IF NOT EXISTS lead_type VARCHAR(20);

ALTER TABLE public.upwork_jobs
  DROP CONSTRAINT IF EXISTS upwork_jobs_lead_type_check;

ALTER TABLE public.upwork_jobs
  ADD CONSTRAINT upwork_jobs_lead_type_check
  CHECK (lead_type IS NULL OR lead_type IN ('hiring', 'post', 'job'));

-- Normalize legacy source value from early extension builds
UPDATE public.upwork_jobs
SET source = 'upwork'
WHERE source IN ('upwork_inspector', 'upwork-inspector', '');

-- Prefix dedupe keys with source so the same URL on different platforms stays distinct
UPDATE public.upwork_jobs
SET dedupe_key = source || ':' || dedupe_key
WHERE dedupe_key NOT LIKE '%:%:%'
  AND dedupe_key NOT LIKE 'upwork:%'
  AND dedupe_key NOT LIKE 'freelancer:%'
  AND dedupe_key NOT LIKE 'wellfound:%'
  AND dedupe_key NOT LIKE 'hackernews:%'
  AND dedupe_key NOT LIKE 'linkedin:%'
  AND dedupe_key NOT LIKE 'reddit:%'
  AND dedupe_key NOT LIKE 'twitter:%'
  AND dedupe_key NOT LIKE 'facebook:%';

ALTER TABLE public.upwork_jobs
  ALTER COLUMN source SET DEFAULT 'upwork';

DROP INDEX IF EXISTS idx_upwork_jobs_job_url_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_upwork_jobs_source_job_url_unique
  ON public.upwork_jobs(source, job_url)
  WHERE job_url IS NOT NULL AND job_url <> '';

CREATE INDEX IF NOT EXISTS idx_upwork_jobs_source
  ON public.upwork_jobs(source);

CREATE INDEX IF NOT EXISTS idx_upwork_jobs_lead_type
  ON public.upwork_jobs(lead_type)
  WHERE lead_type IS NOT NULL;

-- Phase 1: Extend clients table with AI research fields
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS linkedin_url text,
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS technologies text[],
ADD COLUMN IF NOT EXISTS specialties text[],
ADD COLUMN IF NOT EXISTS research_summary jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS last_researched_at timestamp with time zone;

-- Phase 2: Migrate data from companies to clients
-- Match by name (case-insensitive) or website domain
UPDATE public.clients c
SET 
  linkedin_url = COALESCE(c.linkedin_url, comp.linkedin_url),
  logo_url = COALESCE(c.logo_url, comp.logo_url),
  description = COALESCE(c.description, comp.description),
  technologies = COALESCE(c.technologies, comp.technologies),
  specialties = COALESCE(c.specialties, comp.specialties),
  research_summary = COALESCE(c.research_summary, comp.research_summary),
  last_researched_at = COALESCE(c.last_researched_at, comp.last_researched_at)
FROM public.companies comp
WHERE LOWER(c.name) = LOWER(comp.name) 
   OR (c.website IS NOT NULL AND comp.website IS NOT NULL 
       AND LOWER(REGEXP_REPLACE(c.website, '^https?://(www\.)?', '')) = LOWER(REGEXP_REPLACE(comp.website, '^https?://(www\.)?', '')));

-- Phase 3: Remove company_id foreign key from campaign_contacts
ALTER TABLE public.campaign_contacts
DROP COLUMN IF EXISTS company_id;

-- Phase 4: Drop companies table
DROP TABLE IF EXISTS public.companies CASCADE;
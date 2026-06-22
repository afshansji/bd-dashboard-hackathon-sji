-- Phase 1: Company Enhancement Schema

-- 1.1: Add company fields to campaign_contacts table
ALTER TABLE public.campaign_contacts
ADD COLUMN IF NOT EXISTS company_website TEXT,
ADD COLUMN IF NOT EXISTS company_linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS company_industry TEXT,
ADD COLUMN IF NOT EXISTS company_size TEXT,
ADD COLUMN IF NOT EXISTS company_description TEXT,
ADD COLUMN IF NOT EXISTS company_headquarters TEXT,
ADD COLUMN IF NOT EXISTS company_founded_year INTEGER,
ADD COLUMN IF NOT EXISTS company_id UUID;

-- 1.2: Create companies table (centralized company data)
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  website TEXT,
  linkedin_url TEXT,
  description TEXT,
  industry TEXT,
  employee_count TEXT,
  headquarters TEXT,
  founded_year INTEGER,
  logo_url TEXT,
  revenue_range TEXT,
  technologies TEXT[],
  specialties TEXT[],
  research_summary JSONB DEFAULT '{}'::jsonb,
  last_researched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 1.3: Add foreign key relationship
ALTER TABLE public.campaign_contacts
ADD CONSTRAINT fk_campaign_contacts_company
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;

-- 1.4: Create slug generation function for companies
CREATE OR REPLACE FUNCTION public.generate_company_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := LOWER(
      REGEXP_REPLACE(
        REGEXP_REPLACE(NEW.name, '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
      )
    ) || '-' || SUBSTRING(NEW.id::text, 1, 8);
  END IF;
  RETURN NEW;
END;
$$;

-- 1.5: Create trigger for slug generation
CREATE TRIGGER generate_company_slug_trigger
BEFORE INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.generate_company_slug();

-- 1.6: Create trigger for updated_at
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 1.7: Enable RLS on companies table
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 1.8: RLS policies for companies
CREATE POLICY "Authenticated users can view companies"
ON public.companies
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins and creators can update companies"
ON public.companies
FOR UPDATE
TO authenticated
USING (
  auth.uid() = created_by 
  OR has_role(auth.uid(), 'super_admin') 
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete companies"
ON public.companies
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin') 
  OR has_role(auth.uid(), 'admin')
);

-- 1.9: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_slug ON public.companies(slug);
CREATE INDEX IF NOT EXISTS idx_companies_name ON public.companies(name);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_company_id ON public.campaign_contacts(company_id);
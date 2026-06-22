-- Exa integration schema updates (corrected for existing schema)

-- 1. Create leads table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.bd_campaigns(id) ON DELETE CASCADE,
  company_name TEXT,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  industry TEXT,
  status TEXT DEFAULT 'new',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  exa_item_id TEXT,
  imported_via_exa BOOLEAN DEFAULT false,
  last_enriched_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  lead_score_exa NUMERIC,
  enrichment_status TEXT DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON public.leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_exa_item_id ON public.leads(exa_item_id);

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage leads"
  ON public.leads FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    created_by = auth.uid()
  );

-- 2. Campaign research tracking
CREATE TABLE IF NOT EXISTS public.campaign_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.bd_campaigns(id) ON DELETE CASCADE,
  research_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'running', 'completed', 'failed')),
  provider TEXT,
  query TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  results JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_campaign_research_campaign_id ON public.campaign_research(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_research_status ON public.campaign_research(status);

CREATE TRIGGER update_campaign_research_updated_at
  BEFORE UPDATE ON public.campaign_research
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.campaign_research ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campaign collaborators can view research"
  ON public.campaign_research FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    EXISTS (
      SELECT 1
      FROM public.bd_campaigns c
      WHERE c.id = campaign_id
        AND (c.created_by = auth.uid() OR c.owned_by = auth.uid())
    )
  );

CREATE POLICY "Campaign collaborators can insert research"
  ON public.campaign_research FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND (
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'super_admin'::app_role) OR
      EXISTS (
        SELECT 1
        FROM public.bd_campaigns c
        WHERE c.id = campaign_id
          AND (c.created_by = auth.uid() OR c.owned_by = auth.uid())
      )
    )
  );

CREATE POLICY "Campaign collaborators can update research"
  ON public.campaign_research FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1
      FROM public.bd_campaigns c
      WHERE c.id = campaign_id
        AND (c.created_by = auth.uid() OR c.owned_by = auth.uid())
    )
  );

CREATE POLICY "Campaign collaborators can delete research"
  ON public.campaign_research FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    created_by = auth.uid()
  );

-- 3. Lead import jobs tracking
CREATE TABLE IF NOT EXISTS public.lead_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiated_by UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  imported_count INTEGER NOT NULL DEFAULT 0,
  error_details TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_import_jobs_status ON public.lead_import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_lead_import_jobs_initiated_by ON public.lead_import_jobs(initiated_by);

CREATE TRIGGER update_lead_import_jobs_updated_at
  BEFORE UPDATE ON public.lead_import_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.lead_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and job creators can view lead imports"
  ON public.lead_import_jobs FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    auth.uid() = initiated_by
  );

CREATE POLICY "Admins and job creators can manage lead imports"
  ON public.lead_import_jobs FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    auth.uid() = initiated_by
  );
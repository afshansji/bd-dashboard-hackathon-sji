-- Exa integration schema updates

-- 1. Extend leads table with Exa enrichment metadata
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS exa_item_id TEXT,
  ADD COLUMN IF NOT EXISTS imported_via_exa BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_enriched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS lead_score_exa NUMERIC,
  ADD COLUMN IF NOT EXISTS enrichment_status TEXT DEFAULT 'pending';

-- Ensure new defaults apply to existing rows
UPDATE public.leads
SET imported_via_exa = false
WHERE imported_via_exa IS NULL;

UPDATE public.leads
SET metadata = '{}'::jsonb
WHERE metadata IS NULL;

UPDATE public.leads
SET enrichment_status = 'pending'
WHERE enrichment_status IS NULL;

-- 2. Campaign research tracking
CREATE TABLE IF NOT EXISTS public.campaign_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
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
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
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
      FROM public.campaigns c
      WHERE c.id = campaign_id
        AND (
          c.created_by = auth.uid() OR
          c.owner_id = auth.uid()
        )
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
        FROM public.campaigns c
        WHERE c.id = campaign_id
          AND (
            c.created_by = auth.uid() OR
            c.owner_id = auth.uid()
          )
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
      FROM public.campaigns c
      WHERE c.id = campaign_id
        AND (
          c.created_by = auth.uid() OR
          c.owner_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1
      FROM public.campaigns c
      WHERE c.id = campaign_id
        AND (
          c.created_by = auth.uid() OR
          c.owner_id = auth.uid()
        )
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

-- 3. Optional batch tracking for lead imports
CREATE TABLE IF NOT EXISTS public.lead_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
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

CREATE POLICY "Admins and job creators can insert lead imports"
  ON public.lead_import_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    initiated_by = auth.uid()
  );

CREATE POLICY "Admins and job creators can update lead imports"
  ON public.lead_import_jobs FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    auth.uid() = initiated_by
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    auth.uid() = initiated_by
  );

CREATE POLICY "Admins and job creators can delete lead imports"
  ON public.lead_import_jobs FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    auth.uid() = initiated_by
  );

-- 4. Seed user_permissions module placeholders for Exa-driven features
INSERT INTO public.user_permissions (
  user_id,
  module_name,
  can_view,
  can_create,
  can_edit,
  can_delete
)
SELECT
  user_id,
  'leads_exa' AS module_name,
  can_view,
  can_create,
  can_edit,
  can_delete
FROM public.user_permissions
WHERE module_name = 'leads'
ON CONFLICT (user_id, module_name) DO UPDATE
SET
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete;

INSERT INTO public.user_permissions (
  user_id,
  module_name,
  can_view,
  can_create,
  can_edit,
  can_delete
)
SELECT
  user_id,
  'campaigns_exa_research' AS module_name,
  can_view,
  can_create,
  can_edit,
  can_delete
FROM public.user_permissions
WHERE module_name = 'campaigns'
ON CONFLICT (user_id, module_name) DO UPDATE
SET
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete;


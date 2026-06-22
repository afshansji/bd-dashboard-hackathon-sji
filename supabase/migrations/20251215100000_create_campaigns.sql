-- Create helper table for campaign channels
CREATE TABLE IF NOT EXISTS public.campaign_channels (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL
);

INSERT INTO public.campaign_channels (code, label)
VALUES
  ('linkedin', 'LinkedIn'),
  ('email', 'Email'),
  ('cold_call', 'Cold Calling'),
  ('abm', 'Account-Based Marketing'),
  ('events', 'Events & Webinars'),
  ('other', 'Other')
ON CONFLICT (code) DO UPDATE
SET label = EXCLUDED.label;

-- Create campaigns table (v2 schema)
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  objective TEXT,
  target_audience TEXT,
  budget NUMERIC(14,2) DEFAULT 0,
  spend_to_date NUMERIC(14,2) DEFAULT 0,
  primary_channel TEXT NOT NULL REFERENCES public.campaign_channels(code),
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'paused', 'completed', 'archived')),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_campaigns_brand_id ON public.campaigns(brand_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_owner_id ON public.campaigns(owner_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_primary_channel ON public.campaigns(primary_channel);

-- Updated at trigger
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS policies
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view campaigns"
  ON public.campaigns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create campaigns"
  ON public.campaigns FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners and admins can update campaigns"
  ON public.campaigns FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by OR
    auth.uid() = owner_id OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    auth.uid() = created_by OR
    auth.uid() = owner_id OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Creators and admins can delete campaigns"
  ON public.campaigns FOR DELETE
  TO authenticated
  USING (
    auth.uid() = created_by OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Seed default KPIs for new campaigns
CREATE OR REPLACE FUNCTION public.seed_campaign_default_kpis()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.brand_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.brand_kpis (
    brand_id,
    name,
    type,
    description,
    current_value,
    target_value,
    source,
    display_order
  )
  SELECT
    NEW.brand_id,
    data.name,
    data.type,
    data.description,
    0,
    data.target_value,
    data.source,
    data.display_order
  FROM (VALUES
    ('Campaign Leads', 'number', 'Qualified leads attributed to this campaign', NULL::numeric, 'campaigns', 1),
    ('Meetings Booked', 'number', 'Meetings booked from campaign outreach', NULL::numeric, 'campaigns', 2),
    ('Pipeline Value', 'currency', 'Pipeline value tied to the campaign', NULL::numeric, 'campaigns', 3),
    ('Responses Received', 'number', 'Responses captured from the campaign', NULL::numeric, 'campaigns', 4)
  ) AS data(name, type, description, target_value, source, display_order)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.brand_kpis bk
    WHERE bk.brand_id = NEW.brand_id
      AND bk.name = data.name
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bd_campaign_default_kpis ON public.bd_campaigns;

CREATE TRIGGER campaign_default_kpis
  AFTER INSERT ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_campaign_default_kpis();

-- Backfill existing bd_campaigns into campaigns table
INSERT INTO public.campaigns (
  id,
  name,
  brand_id,
  owner_id,
  objective,
  target_audience,
  budget,
  spend_to_date,
  primary_channel,
  metrics,
  metadata,
  status,
  start_date,
  end_date,
  created_at,
  created_by,
  updated_at,
  updated_by
)
SELECT
  bc.id,
  bc.name,
  bc.brand_id,
  u_owner.id,
  initcap(replace(bc.campaign_type, '_', ' ')),
  CASE
    WHEN bc.target_contacts IS NOT NULL AND array_length(bc.target_contacts, 1) > 0 THEN array_to_string(bc.target_contacts, ', ')
    WHEN bc.target_regions IS NOT NULL AND array_length(bc.target_regions, 1) > 0 THEN array_to_string(bc.target_regions, ', ')
    ELSE NULL
  END,
  0,
  0,
  CASE bc.campaign_type
    WHEN 'linkedin_outbound' THEN 'linkedin'
    WHEN 'email_outbound' THEN 'email'
    WHEN 'cold_calling' THEN 'cold_call'
    WHEN 'abm' THEN 'abm'
    ELSE 'other'
  END,
  jsonb_strip_nulls(jsonb_build_object(
    'target_contacts_count', bc.target_contacts_count,
    'actual_contacts_reached', bc.actual_contacts_reached,
    'responses_received', bc.responses_received,
    'meetings_booked', bc.meetings_booked,
    'deals_generated', bc.deals_generated
  )),
  jsonb_strip_nulls(jsonb_build_object(
    'legacy', jsonb_strip_nulls(jsonb_build_object(
      'niche_id', bc.niche_id,
      'target_contacts', bc.target_contacts,
      'target_regions', bc.target_regions,
      'ghl_campaign_id', bc.ghl_campaign_id,
      'linkedin_campaign_id', bc.linkedin_campaign_id,
      'ai_agent_id', bc.ai_agent_id,
      'content_template', bc.content_template,
      'research_data', bc.research_data,
      'linkedin_stats', bc.linkedin_stats,
      'ghl_stats', bc.ghl_stats,
      'linkedin_research_summary', bc.linkedin_research_summary,
      'contacts_summary', bc.contacts_summary
    ))
  )),
  bc.status,
  bc.start_date,
  bc.end_date,
  bc.created_at,
  u_created.id,
  bc.updated_at,
  u_owner.id
FROM public.bd_campaigns bc
LEFT JOIN public.users u_owner ON u_owner.id = bc.owned_by
LEFT JOIN public.users u_created ON u_created.id = bc.created_by
ON CONFLICT (id) DO NOTHING;

-- Mark bd_campaigns as deprecated
COMMENT ON TABLE public.bd_campaigns IS 'Deprecated in favor of public.campaigns (v2 schema).';

-- Repoint related tables to the new campaigns table
ALTER TABLE public.campaign_contacts
  DROP CONSTRAINT IF EXISTS campaign_contacts_campaign_id_fkey,
  ADD CONSTRAINT campaign_contacts_campaign_id_fkey
    FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;

ALTER TABLE public.campaign_activities
  DROP CONSTRAINT IF EXISTS campaign_activities_campaign_id_fkey,
  ADD CONSTRAINT campaign_activities_campaign_id_fkey
    FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;

-- Update user permissions to align with new campaigns module
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
  'campaigns' AS module_name,
  can_view,
  can_create,
  can_edit,
  can_delete
FROM public.user_permissions
WHERE module_name = 'bd_campaigns'
ON CONFLICT (user_id, module_name) DO UPDATE
SET
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete;

DELETE FROM public.user_permissions
WHERE module_name = 'bd_campaigns';

-- Ensure existing contact/activity records continue to match default KPI seeding
-- Rollback helper: provide notice for manual reversal steps
DO $$
BEGIN
  RAISE NOTICE 'Migration 20251215100000_create_campaigns applied. To rollback, drop dependent foreign keys, delete from public.campaigns, and recreate public.bd_campaigns if required.';
END $$;

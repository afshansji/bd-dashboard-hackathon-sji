-- Phase 1: Database Schema Enhancement for HubSpot Integration

-- 1.1 Add HubSpot integration fields to clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS hubspot_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS hubspot_sync_status TEXT DEFAULT 'never_synced' CHECK (hubspot_sync_status IN ('never_synced', 'synced', 'error', 'pending')),
ADD COLUMN IF NOT EXISTS hubspot_last_sync TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS hubspot_sync_metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'hubspot', 'import')),
ADD COLUMN IF NOT EXISTS data_completeness_score NUMERIC(5,2) CHECK (data_completeness_score >= 0 AND data_completeness_score <= 100),
ADD COLUMN IF NOT EXISTS company_revenue NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS monthly_billing NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS team_size INTEGER,
ADD COLUMN IF NOT EXISTS founded_year INTEGER,
ADD COLUMN IF NOT EXISTS state TEXT;

-- 1.2 Create contacts table
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  hubspot_id TEXT UNIQUE,
  hubspot_sync_status TEXT DEFAULT 'never_synced' CHECK (hubspot_sync_status IN ('never_synced', 'synced', 'error', 'pending')),
  hubspot_last_sync TIMESTAMP WITH TIME ZONE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  job_title TEXT,
  title TEXT,
  lifecycle_stage TEXT,
  lead_status TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 1.3 Create deals table
CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  hubspot_id TEXT UNIQUE,
  hubspot_created_at TIMESTAMP WITH TIME ZONE,
  hubspot_updated_at TIMESTAMP WITH TIME ZONE,
  name TEXT NOT NULL,
  amount NUMERIC(15,2),
  stage TEXT,
  pipeline TEXT,
  probability NUMERIC(5,2) CHECK (probability >= 0 AND probability <= 100),
  close_date DATE,
  deal_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 1.4 Create activities table
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  hubspot_id TEXT UNIQUE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('email', 'meeting', 'call', 'note', 'task')),
  subject TEXT,
  body TEXT,
  outcome TEXT,
  activity_date TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 1.5 Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_hubspot_id ON public.clients(hubspot_id);
CREATE INDEX IF NOT EXISTS idx_clients_source ON public.clients(source);
CREATE INDEX IF NOT EXISTS idx_clients_hubspot_sync_status ON public.clients(hubspot_sync_status);
CREATE INDEX IF NOT EXISTS idx_contacts_client_id ON public.contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_contacts_hubspot_id ON public.contacts(hubspot_id);
CREATE INDEX IF NOT EXISTS idx_contacts_is_primary ON public.contacts(is_primary);
CREATE INDEX IF NOT EXISTS idx_deals_client_id ON public.deals(client_id);
CREATE INDEX IF NOT EXISTS idx_deals_hubspot_id ON public.deals(hubspot_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON public.deals(stage);
CREATE INDEX IF NOT EXISTS idx_activities_client_id ON public.activities(client_id);
CREATE INDEX IF NOT EXISTS idx_activities_deal_id ON public.activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_activities_hubspot_id ON public.activities(hubspot_id);
CREATE INDEX IF NOT EXISTS idx_activities_activity_type ON public.activities(activity_type);

-- 1.6 Add update triggers for all tables (reuse existing function)
DROP TRIGGER IF EXISTS update_contacts_updated_at ON public.contacts;
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_deals_updated_at ON public.deals;
CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_activities_updated_at ON public.activities;
CREATE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 1.7 Enable Row Level Security on new tables
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- 1.8 Create RLS policies for contacts
CREATE POLICY "Super admins can manage all contacts"
  ON public.contacts
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id::text = auth.uid()::text
    AND users.role = 'super_admin'::app_role
  ));

CREATE POLICY "Managers can view and edit contacts"
  ON public.contacts
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id::text = auth.uid()::text
    AND users.role IN ('super_admin'::app_role, 'manager'::app_role)
  ));

-- 1.9 Create RLS policies for deals
CREATE POLICY "Super admins can manage all deals"
  ON public.deals
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id::text = auth.uid()::text
    AND users.role = 'super_admin'::app_role
  ));

CREATE POLICY "Managers can view and edit deals"
  ON public.deals
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id::text = auth.uid()::text
    AND users.role IN ('super_admin'::app_role, 'manager'::app_role)
  ));

-- 1.10 Create RLS policies for activities
CREATE POLICY "Super admins can manage all activities"
  ON public.activities
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id::text = auth.uid()::text
    AND users.role = 'super_admin'::app_role
  ));

CREATE POLICY "Managers can view and edit activities"
  ON public.activities
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id::text = auth.uid()::text
    AND users.role IN ('super_admin'::app_role, 'manager'::app_role)
  ));
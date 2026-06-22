-- Phase 1: n8n + Google Analytics integration tables

-- Create security definer helper function to check if user is marketing or manager
CREATE OR REPLACE FUNCTION public.user_is_marketing_or_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = _user_id
      AND (role IN ('super_admin', 'manager') OR is_marketing = true)
  )
$$;

-- Create security definer helper function to check brand access
CREATE OR REPLACE FUNCTION public.user_has_brand_access(_user_id uuid, _brand_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.brands
    WHERE id = _brand_id
      AND (
        owner_id = _user_id
        OR co_owner_id = _user_id
        OR _user_id = ANY(team_members)
      )
  )
$$;

-- Create table to store per-brand n8n analytics integration configuration
CREATE TABLE IF NOT EXISTS public.brand_analytics_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL DEFAULT 'n8n_analytics',
  webhook_url TEXT NOT NULL,
  webhook_secret TEXT NOT NULL,
  n8n_workflow_id TEXT,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_frequency TEXT DEFAULT 'daily',
  data_sources JSONB DEFAULT '{"google_analytics": true}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id),
  UNIQUE(brand_id, integration_type)
);

-- Table for storing analytics payloads delivered by n8n
CREATE TABLE IF NOT EXISTS public.brand_analytics_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES public.brand_analytics_integrations(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  metrics JSONB NOT NULL,
  dimensions JSONB DEFAULT '{}'::jsonb,
  raw_data JSONB,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performant lookups
CREATE INDEX IF NOT EXISTS idx_brand_analytics_integrations_brand
  ON public.brand_analytics_integrations(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_analytics_data_brand_date
  ON public.brand_analytics_data(brand_id, date_range_start DESC);

-- Enable row level security
ALTER TABLE public.brand_analytics_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_analytics_data ENABLE ROW LEVEL SECURITY;

-- RLS policies using security definer functions (no recursion)
CREATE POLICY "Marketing team can manage brand analytics integrations"
  ON public.brand_analytics_integrations
  FOR ALL
  USING (
    public.user_is_marketing_or_manager(auth.uid())
    OR public.user_has_brand_access(auth.uid(), brand_id)
  )
  WITH CHECK (
    public.user_is_marketing_or_manager(auth.uid())
    OR public.user_has_brand_access(auth.uid(), brand_id)
  );

-- Allow marketing team members and brand collaborators to read analytics payloads
CREATE POLICY "Marketing team can view brand analytics data"
  ON public.brand_analytics_data
  FOR SELECT
  USING (
    public.user_is_marketing_or_manager(auth.uid())
    OR public.user_has_brand_access(auth.uid(), brand_id)
  );

-- Allow inserts via service role for webhook endpoint
CREATE POLICY "Allow insert via service role"
  ON public.brand_analytics_data
  FOR INSERT
  WITH CHECK (true);

-- Keep timestamps fresh (reuse existing trigger function)
CREATE TRIGGER update_brand_analytics_integrations_updated_at
  BEFORE UPDATE ON public.brand_analytics_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
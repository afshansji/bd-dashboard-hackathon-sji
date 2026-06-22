-- Phase 1: n8n + Google Analytics integration tables

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

-- Enable row level security and policies
ALTER TABLE public.brand_analytics_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_analytics_data ENABLE ROW LEVEL SECURITY;

-- Allow marketing team members and admins to manage integrations, while brand collaborators can manage their own brand
CREATE POLICY "Marketing team can manage brand analytics integrations"
  ON public.brand_analytics_integrations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND (users.role IN ('super_admin', 'manager') OR users.is_marketing = true)
    )
    OR EXISTS (
      SELECT 1 FROM public.brands b
      WHERE b.id = brand_analytics_integrations.brand_id
        AND (
          b.owner_id = auth.uid()
          OR b.co_owner_id = auth.uid()
          OR auth.uid() = ANY(b.team_members)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND (users.role IN ('super_admin', 'manager') OR users.is_marketing = true)
    )
    OR EXISTS (
      SELECT 1 FROM public.brands b
      WHERE b.id = brand_analytics_integrations.brand_id
        AND (
          b.owner_id = auth.uid()
          OR b.co_owner_id = auth.uid()
          OR auth.uid() = ANY(b.team_members)
        )
    )
  );

-- Allow marketing team members and brand collaborators to read analytics payloads
CREATE POLICY "Marketing team can view brand analytics data"
  ON public.brand_analytics_data
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND (users.role IN ('super_admin', 'manager') OR users.is_marketing = true)
    )
    OR EXISTS (
      SELECT 1 FROM public.brands b
      WHERE b.id = brand_analytics_data.brand_id
        AND (
          b.owner_id = auth.uid()
          OR b.co_owner_id = auth.uid()
          OR auth.uid() = ANY(b.team_members)
        )
    )
  );

-- Allow inserts via trusted automation through service key (handled in edge function)
CREATE POLICY "Allow insert via service role" ON public.brand_analytics_data
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Keep timestamps fresh
CREATE TRIGGER update_brand_analytics_integrations_updated_at
  BEFORE UPDATE ON public.brand_analytics_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_brand_analytics_data_created_at
  BEFORE UPDATE ON public.brand_analytics_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

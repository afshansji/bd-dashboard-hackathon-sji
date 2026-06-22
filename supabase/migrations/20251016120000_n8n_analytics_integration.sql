-- Phase 1: n8n + Google Analytics integration tables (patched for user_roles schema)

-- brand_analytics_integrations already created in 20251013225118

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

CREATE INDEX IF NOT EXISTS idx_brand_analytics_data_brand_date
  ON public.brand_analytics_data(brand_id, date_range_start DESC);

ALTER TABLE public.brand_analytics_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Marketing team can view brand analytics data"
  ON public.brand_analytics_data
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.is_marketing = true
    )
    OR EXISTS (
      SELECT 1 FROM public.brands b
      WHERE b.id = brand_analytics_data.brand_id
        AND b.owner_id = auth.uid()
    )
  );

CREATE POLICY "Allow insert via service role"
  ON public.brand_analytics_data
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

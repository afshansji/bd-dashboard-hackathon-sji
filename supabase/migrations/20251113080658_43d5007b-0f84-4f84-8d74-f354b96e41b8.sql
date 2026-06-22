-- Recreate brand_kpis if missing (dropped by 20251022034500 on existing installs)
CREATE TABLE IF NOT EXISTS public.brand_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  current_value NUMERIC NOT NULL DEFAULT 0,
  target_value NUMERIC,
  source TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brand_kpis_brand_id_idx ON public.brand_kpis(brand_id);
ALTER TABLE public.brand_kpis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view brand KPIs" ON public.brand_kpis;
CREATE POLICY "Authenticated users can view brand KPIs"
  ON public.brand_kpis FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can manage brand KPIs" ON public.brand_kpis;
CREATE POLICY "Admins can manage brand KPIs"
  ON public.brand_kpis FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Insert default PandaDoc KPIs for all brands
INSERT INTO public.brand_kpis (brand_id, name, description, type, source)
SELECT 
  id,
  'Proposals Sent',
  'Total number of proposals sent to clients',
  'number',
  'pandadoc'
FROM public.brands
WHERE NOT EXISTS (
  SELECT 1 FROM public.brand_kpis 
  WHERE brand_id = brands.id 
  AND name = 'Proposals Sent' 
  AND source = 'pandadoc'
);

INSERT INTO public.brand_kpis (brand_id, name, description, type, source)
SELECT 
  id,
  'Proposals Signed',
  'Number of signed proposals',
  'number',
  'pandadoc'
FROM public.brands
WHERE NOT EXISTS (
  SELECT 1 FROM public.brand_kpis 
  WHERE brand_id = brands.id 
  AND name = 'Proposals Signed' 
  AND source = 'pandadoc'
);

INSERT INTO public.brand_kpis (brand_id, name, description, type, source)
SELECT 
  id,
  'Avg Time to Signature',
  'Average time from send to signature (in hours)',
  'number',
  'pandadoc'
FROM public.brands
WHERE NOT EXISTS (
  SELECT 1 FROM public.brand_kpis 
  WHERE brand_id = brands.id 
  AND name = 'Avg Time to Signature' 
  AND source = 'pandadoc'
);
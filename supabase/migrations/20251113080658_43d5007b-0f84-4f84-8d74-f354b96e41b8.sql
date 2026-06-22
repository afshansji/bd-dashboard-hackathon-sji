-- Insert default PandaDoc KPIs for all brands
INSERT INTO public.brand_kpis (brand_id, name, description, kpi_type, source)
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

INSERT INTO public.brand_kpis (brand_id, name, description, kpi_type, source)
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

INSERT INTO public.brand_kpis (brand_id, name, description, kpi_type, source)
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
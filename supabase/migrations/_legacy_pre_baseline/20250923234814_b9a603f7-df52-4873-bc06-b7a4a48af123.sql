-- Enhance brands table to match frontend requirements
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS type text DEFAULT 'internal' CHECK (type IN ('internal', 'client')),
ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS team_members uuid[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS active_integrations text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS monthly_budget numeric;

-- Update existing brands to have valid data
UPDATE public.brands 
SET type = 'internal', is_active = true 
WHERE type IS NULL OR is_active IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_brands_owner_id ON public.brands(owner_id);
CREATE INDEX IF NOT EXISTS idx_brands_type ON public.brands(type);
CREATE INDEX IF NOT EXISTS idx_brands_status ON public.brands(status);

-- Create brand_kpis table for KPI management
CREATE TABLE IF NOT EXISTS public.brand_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('number', 'percentage', 'currency')),
  description text,
  current_value numeric NOT NULL DEFAULT 0,
  target_value numeric,
  source text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on brand_kpis
ALTER TABLE public.brand_kpis ENABLE ROW LEVEL SECURITY;

-- RLS policies for brand_kpis
CREATE POLICY "Super admins can manage all brand KPIs" 
ON public.brand_kpis 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.users 
  WHERE users.id::text = auth.uid()::text 
  AND users.role = 'super_admin'::app_role
));

CREATE POLICY "Managers can view all brand KPIs" 
ON public.brand_kpis 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.users 
  WHERE users.id::text = auth.uid()::text 
  AND users.role = ANY(ARRAY['super_admin'::app_role, 'manager'::app_role])
));

-- Create indexes for brand_kpis
CREATE INDEX IF NOT EXISTS idx_brand_kpis_brand_id ON public.brand_kpis(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_kpis_display_order ON public.brand_kpis(brand_id, display_order);

-- Create trigger for brand_kpis updated_at
CREATE TRIGGER update_brand_kpis_updated_at
  BEFORE UPDATE ON public.brand_kpis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
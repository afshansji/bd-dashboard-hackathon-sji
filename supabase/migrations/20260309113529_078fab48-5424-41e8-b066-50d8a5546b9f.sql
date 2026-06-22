
-- Add missing columns to deals table for Business Opportunities UI
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS deal_name TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS value NUMERIC;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS days_in_stage INTEGER DEFAULT 0;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS actual_deal_owner_id UUID;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS actual_deal_owner_email TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS actual_deal_owner_name TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS bd_rep_id UUID;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS expected_close_date TIMESTAMPTZ;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS created_date TIMESTAMPTZ;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS client TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS owner TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS lovable_url TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS pod_assigned TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS hubspot_owner_id BIGINT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS clientcompanyname TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS clientemail TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS clientlinkedinbio TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS clientwebsite TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS clientfirstname TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS clientlastname TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS clientphone TEXT;

-- Create hubspot_owners table
CREATE TABLE IF NOT EXISTS public.hubspot_owners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hubspot_owner_id TEXT NOT NULL UNIQUE,
  owner_email TEXT,
  owner_first_name TEXT,
  owner_last_name TEXT,
  owner_full_name TEXT,
  is_active BOOLEAN DEFAULT true,
  teams TEXT[] DEFAULT '{}',
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hubspot_owners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view hubspot_owners" ON public.hubspot_owners
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage hubspot_owners" ON public.hubspot_owners
  FOR ALL USING (public.is_manager_or_admin());

-- Create get_deal_stage_counts RPC function
CREATE OR REPLACE FUNCTION public.get_deal_stage_counts()
RETURNS TABLE(stage TEXT, count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT stage, COUNT(*) as count
  FROM public.deals
  WHERE deleted_at IS NULL
    AND stage IS NOT NULL
  GROUP BY stage
  ORDER BY stage;
$$;

GRANT EXECUTE ON FUNCTION public.get_deal_stage_counts() TO authenticated;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_deals_deal_name ON public.deals(deal_name);
CREATE INDEX IF NOT EXISTS idx_deals_value ON public.deals(value);
CREATE INDEX IF NOT EXISTS idx_deals_deleted_at ON public.deals(deleted_at);
CREATE INDEX IF NOT EXISTS idx_deals_expected_close_date ON public.deals(expected_close_date);
CREATE INDEX IF NOT EXISTS idx_deals_bd_rep_id ON public.deals(bd_rep_id);
CREATE INDEX IF NOT EXISTS idx_deals_actual_deal_owner_email ON public.deals(actual_deal_owner_email);
CREATE INDEX IF NOT EXISTS idx_deals_days_in_stage ON public.deals(days_in_stage);
CREATE INDEX IF NOT EXISTS idx_deals_owner ON public.deals(owner);

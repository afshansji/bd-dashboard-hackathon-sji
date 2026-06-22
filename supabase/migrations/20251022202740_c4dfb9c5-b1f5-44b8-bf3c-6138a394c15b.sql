-- Add missing columns to deals table for Control Tower sync
ALTER TABLE public.deals 
ADD COLUMN IF NOT EXISTS dealtype TEXT,
ADD COLUMN IF NOT EXISTS hubspot_deal_id TEXT,
ADD COLUMN IF NOT EXISTS hubspot_crm_deal_url TEXT,
ADD COLUMN IF NOT EXISTS lead_source TEXT,
ADD COLUMN IF NOT EXISTS expected_closing_date DATE,
ADD COLUMN IF NOT EXISTS potential_amount NUMERIC,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS external_links JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS last_activity_date DATE,
ADD COLUMN IF NOT EXISTS last_activity_by UUID;

-- Add indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_deals_dealtype ON public.deals(dealtype);
CREATE INDEX IF NOT EXISTS idx_deals_lead_source ON public.deals(lead_source);
CREATE INDEX IF NOT EXISTS idx_deals_priority ON public.deals(priority);
CREATE INDEX IF NOT EXISTS idx_deals_hubspot_deal_id ON public.deals(hubspot_deal_id);
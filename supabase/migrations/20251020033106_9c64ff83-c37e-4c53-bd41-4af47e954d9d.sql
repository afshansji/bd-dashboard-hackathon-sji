-- Add Control Tower tracking fields to deals table
ALTER TABLE public.deals 
ADD COLUMN IF NOT EXISTS control_tower_id TEXT,
ADD COLUMN IF NOT EXISTS synced_from_control_tower BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS control_tower_status TEXT,
ADD COLUMN IF NOT EXISTS pm_assigned_id UUID;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_deals_control_tower_id ON public.deals(control_tower_id);

-- Add unique constraint to prevent duplicate syncs
ALTER TABLE public.deals 
ADD CONSTRAINT unique_control_tower_deal 
UNIQUE (control_tower_id);
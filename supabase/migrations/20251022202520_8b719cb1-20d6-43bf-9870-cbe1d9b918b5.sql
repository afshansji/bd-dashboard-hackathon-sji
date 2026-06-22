-- Add control_tower_metadata column to deals table
ALTER TABLE public.deals 
ADD COLUMN IF NOT EXISTS control_tower_metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.deals.control_tower_metadata IS 'Stores raw Control Tower data for debugging and auditing purposes';
-- Add campaign_types array column to support multiple campaign types
ALTER TABLE public.bd_campaigns 
  ADD COLUMN campaign_types text[];

-- Migrate existing single type to array format
UPDATE public.bd_campaigns 
  SET campaign_types = ARRAY[campaign_type]::text[]
  WHERE campaign_type IS NOT NULL;

-- Add check to ensure at least one campaign type is selected
ALTER TABLE public.bd_campaigns
  ADD CONSTRAINT campaign_types_not_empty 
  CHECK (array_length(campaign_types, 1) > 0);

-- Keep legacy column for backwards compatibility (optional - can drop later)
-- The campaign_type column will remain for now but campaign_types will be the primary field
-- Add category and POD reference to deals table to match Control Tower structure
ALTER TABLE deals 
ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE deals 
ADD COLUMN IF NOT EXISTS pod_id UUID REFERENCES pods(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_deals_category ON deals(category);
CREATE INDEX IF NOT EXISTS idx_deals_pod_id ON deals(pod_id);

-- Add comment for documentation
COMMENT ON COLUMN deals.category IS 'Deal category from Control Tower (e.g., Development, Design, Consulting)';
COMMENT ON COLUMN deals.pod_id IS 'Reference to the POD (team) handling this deal';
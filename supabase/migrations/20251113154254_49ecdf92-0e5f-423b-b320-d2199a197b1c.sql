-- Add tags support to campaign_contacts
ALTER TABLE campaign_contacts 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tag_colors JSONB DEFAULT '{}';

-- Create GIN index for efficient tag queries
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_tags ON campaign_contacts USING GIN(tags);

-- Add comment for documentation
COMMENT ON COLUMN campaign_contacts.tags IS 'Array of tag labels for contact categorization';
COMMENT ON COLUMN campaign_contacts.tag_colors IS 'JSON mapping of tag names to hex color codes';
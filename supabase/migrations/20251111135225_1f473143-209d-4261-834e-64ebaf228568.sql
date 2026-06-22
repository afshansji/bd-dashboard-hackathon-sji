-- Add hubspot_id to contacts table for HubSpot syncing
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS hubspot_id TEXT UNIQUE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_contacts_hubspot_id 
ON contacts(hubspot_id) 
WHERE hubspot_id IS NOT NULL;
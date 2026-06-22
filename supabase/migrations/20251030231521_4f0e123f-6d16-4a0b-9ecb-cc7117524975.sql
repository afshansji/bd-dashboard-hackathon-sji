-- Add GoHighLevel sync tracking columns to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS gohighlevel_contact_id TEXT,
ADD COLUMN IF NOT EXISTS gohighlevel_last_synced_at TIMESTAMP WITH TIME ZONE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_clients_gohighlevel_contact_id 
ON clients(gohighlevel_contact_id);

-- Add comment for documentation
COMMENT ON COLUMN clients.gohighlevel_contact_id IS 'GoHighLevel CRM contact ID for sync tracking';
COMMENT ON COLUMN clients.gohighlevel_last_synced_at IS 'Last time this client was synced to GoHighLevel CRM';
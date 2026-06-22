-- Add client contact fields to deals table
ALTER TABLE deals ADD COLUMN IF NOT EXISTS client_email TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS client_phone TEXT;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_deals_client_email ON deals(client_email);
CREATE INDEX IF NOT EXISTS idx_deals_client_phone ON deals(client_phone);

-- Add comments to describe the columns
COMMENT ON COLUMN deals.client_email IS 'Email address of the client contact for this deal';
COMMENT ON COLUMN deals.client_phone IS 'Phone number of the client contact for this deal';


-- Add client_email column to deals table
ALTER TABLE deals ADD COLUMN IF NOT EXISTS client_email TEXT;

-- Add index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_deals_client_email ON deals(client_email);

-- Add comment to describe the column
COMMENT ON COLUMN deals.client_email IS 'Email address of the client contact for this deal';


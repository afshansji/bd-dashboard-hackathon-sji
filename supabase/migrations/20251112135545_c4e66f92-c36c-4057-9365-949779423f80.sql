-- Drop the unique constraint on company name
-- This allows multiple companies with the same name but different HubSpot IDs
DROP INDEX IF EXISTS idx_clients_company_unique;

-- Create a non-unique index for query performance on company name lookups
-- This maintains fast searches while allowing duplicate company names
CREATE INDEX IF NOT EXISTS idx_clients_company_lower 
  ON clients (lower(company)) 
  WHERE company IS NOT NULL;
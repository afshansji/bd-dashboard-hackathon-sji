-- Add unique constraints for HubSpot IDs to enable upsert operations

-- Add unique constraint on clients.hubspot_id
ALTER TABLE clients 
ADD CONSTRAINT clients_hubspot_id_key UNIQUE (hubspot_id);

-- Add unique constraint on deals.hubspot_deal_id  
ALTER TABLE deals
ADD CONSTRAINT deals_hubspot_deal_id_key UNIQUE (hubspot_deal_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_hubspot_id 
ON clients(hubspot_id) 
WHERE hubspot_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_deals_hubspot_deal_id
ON deals(hubspot_deal_id)
WHERE hubspot_deal_id IS NOT NULL;
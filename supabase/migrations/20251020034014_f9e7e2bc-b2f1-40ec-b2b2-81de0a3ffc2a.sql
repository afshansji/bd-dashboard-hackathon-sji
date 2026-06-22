-- Add Control Tower reference columns as TEXT to avoid foreign key issues
ALTER TABLE deals 
ADD COLUMN IF NOT EXISTS control_tower_client_id TEXT,
ADD COLUMN IF NOT EXISTS control_tower_owner_id TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_deals_control_tower_client_id ON deals(control_tower_client_id);
CREATE INDEX IF NOT EXISTS idx_deals_control_tower_owner_id ON deals(control_tower_owner_id);
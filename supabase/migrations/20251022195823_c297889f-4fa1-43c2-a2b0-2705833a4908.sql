-- Add Control Tower tracking to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS control_tower_id TEXT;

CREATE INDEX IF NOT EXISTS idx_clients_control_tower_id 
ON clients(control_tower_id);

-- Add unique constraint for checklist items to enable upsert during sync
-- Using deal_id + order_index as the unique constraint
ALTER TABLE deal_checklist_items 
DROP CONSTRAINT IF EXISTS unique_deal_checklist_order;

ALTER TABLE deal_checklist_items 
ADD CONSTRAINT unique_deal_checklist_order 
UNIQUE (deal_id, order_index);
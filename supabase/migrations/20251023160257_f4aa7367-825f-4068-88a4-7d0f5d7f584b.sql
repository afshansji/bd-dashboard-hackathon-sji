-- Add control_tower_item_id column for bi-directional checklist sync
ALTER TABLE deal_checklist_items 
ADD COLUMN control_tower_item_id TEXT;

-- Add index for faster lookups
CREATE INDEX idx_deal_checklist_control_tower_id 
ON deal_checklist_items(control_tower_item_id) 
WHERE control_tower_item_id IS NOT NULL;

-- Add unique constraint to prevent duplicate items from Control Tower
CREATE UNIQUE INDEX idx_deal_checklist_unique_ct_item 
ON deal_checklist_items(deal_id, control_tower_item_id) 
WHERE control_tower_item_id IS NOT NULL;

-- Note: We keep order_index for manual items created in BD Portal
-- Items from Control Tower will use control_tower_item_id for uniqueness
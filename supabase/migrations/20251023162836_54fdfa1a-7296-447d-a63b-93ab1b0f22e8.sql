-- Drop the partial unique constraint if it exists
ALTER TABLE deal_checklist_items 
DROP CONSTRAINT IF EXISTS deal_checklist_items_deal_id_control_tower_item_id_key;

-- Add a full unique constraint (without WHERE clause)
-- This allows Supabase upsert to work with onConflict parameter
ALTER TABLE deal_checklist_items 
ADD CONSTRAINT deal_checklist_items_deal_id_control_tower_item_id_key 
UNIQUE (deal_id, control_tower_item_id);
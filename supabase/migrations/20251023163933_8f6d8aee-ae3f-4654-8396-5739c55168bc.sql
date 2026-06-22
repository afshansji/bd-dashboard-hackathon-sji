-- Remove the unique constraint on (deal_id, order_index)
-- This allows importing checklist items with duplicate order_index values from Control Tower
ALTER TABLE deal_checklist_items 
DROP CONSTRAINT IF EXISTS unique_deal_checklist_order;
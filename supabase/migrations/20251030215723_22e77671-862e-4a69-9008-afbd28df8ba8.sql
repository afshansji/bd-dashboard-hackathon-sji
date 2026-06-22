
-- Step 4: Add partial unique index to prevent duplicate local checklist items
-- This prevents duplicate titles for locally-created items (control_tower_item_id IS NULL)
-- while allowing Control Tower items to sync normally
CREATE UNIQUE INDEX IF NOT EXISTS idx_deal_checklist_unique_local_title 
ON deal_checklist_items (deal_id, lower(trim(title))) 
WHERE control_tower_item_id IS NULL;

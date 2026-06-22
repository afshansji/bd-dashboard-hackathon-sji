-- Phase 1: Clean up duplicate local template items for Control Tower-synced deals
-- This removes all checklist items that don't have a control_tower_item_id (local template items)
-- for deals that are synced from Control Tower

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete local template items (no control_tower_item_id) for CT-synced deals
  WITH deleted AS (
    DELETE FROM deal_checklist_items
    WHERE control_tower_item_id IS NULL
      AND deal_id IN (
        SELECT id FROM deals WHERE synced_from_control_tower = true
      )
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  -- Log the cleanup operation (using 'pull' as sync_type)
  INSERT INTO control_tower_sync_log (
    sync_type,
    entity_type,
    status,
    payload
  ) VALUES (
    'pull',
    'checklist',
    'success',
    jsonb_build_object(
      'operation', 'cleanup_duplicates',
      'deleted_count', deleted_count,
      'cleanup_reason', 'Remove duplicate local template items from Control Tower-synced deals',
      'timestamp', NOW()
    )
  );

  RAISE NOTICE 'Deleted % duplicate checklist items', deleted_count;
END $$;
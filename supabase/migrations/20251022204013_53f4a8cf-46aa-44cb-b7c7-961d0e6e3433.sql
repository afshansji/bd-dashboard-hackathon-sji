-- Add missing columns to control_tower_sync_log for better tracking
ALTER TABLE control_tower_sync_log 
ADD COLUMN IF NOT EXISTS synced_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS entity_id UUID,
ADD COLUMN IF NOT EXISTS control_tower_id TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sync_log_synced_by ON control_tower_sync_log(synced_by);
CREATE INDEX IF NOT EXISTS idx_sync_log_entity_id ON control_tower_sync_log(entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_control_tower_id ON control_tower_sync_log(control_tower_id);
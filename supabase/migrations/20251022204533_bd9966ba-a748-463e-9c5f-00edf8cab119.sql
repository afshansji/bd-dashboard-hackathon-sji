-- Create control_tower_sync_log for fresh databases (skipped in earlier no-op migration)
CREATE TABLE IF NOT EXISTS public.control_tower_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  control_tower_id text,
  status text NOT NULL DEFAULT 'pending',
  payload jsonb,
  error_message text,
  synced_at timestamptz DEFAULT now(),
  synced_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_log_synced_by ON control_tower_sync_log(synced_by);
CREATE INDEX IF NOT EXISTS idx_sync_log_entity_id ON control_tower_sync_log(entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_control_tower_id ON control_tower_sync_log(control_tower_id);

-- Add foreign key constraint for synced_by column (skip if already defined)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_sync_log_synced_by'
  ) THEN
    ALTER TABLE control_tower_sync_log
      ADD CONSTRAINT fk_sync_log_synced_by
      FOREIGN KEY (synced_by)
      REFERENCES public.users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

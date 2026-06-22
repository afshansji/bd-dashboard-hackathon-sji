-- Add foreign key constraint for synced_by column
ALTER TABLE control_tower_sync_log 
ADD CONSTRAINT fk_sync_log_synced_by 
FOREIGN KEY (synced_by) 
REFERENCES public.users(id) 
ON DELETE SET NULL;
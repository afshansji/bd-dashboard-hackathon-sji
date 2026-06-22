-- Add missing columns to deal_files table for Google Drive sync
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'deal_files'
  ) THEN
    ALTER TABLE public.deal_files
      ADD COLUMN IF NOT EXISTS drive_folder_id TEXT,
      ADD COLUMN IF NOT EXISTS drive_created_at TIMESTAMPTZ;

    CREATE INDEX IF NOT EXISTS idx_deal_files_drive_folder ON deal_files(drive_folder_id);
  END IF;
END $$;

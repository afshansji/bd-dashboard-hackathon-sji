-- Add missing columns to deal_files table for Google Drive sync
ALTER TABLE public.deal_files 
ADD COLUMN IF NOT EXISTS drive_folder_id TEXT,
ADD COLUMN IF NOT EXISTS drive_created_at TIMESTAMPTZ;

-- Add index for faster folder lookups
CREATE INDEX IF NOT EXISTS idx_deal_files_drive_folder ON deal_files(drive_folder_id);

-- Update RLS policies to ensure authenticated users can view files
-- (policies already exist, this is just a verification comment)
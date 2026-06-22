-- Add unique constraint to deal_files.drive_file_id for proper upsert behavior
-- This allows the sync function to update existing files instead of failing on duplicates
ALTER TABLE deal_files 
ADD CONSTRAINT deal_files_drive_file_id_unique UNIQUE (drive_file_id);
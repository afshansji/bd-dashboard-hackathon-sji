-- Create deal_files early for fresh databases; downstream migrations extend this table
CREATE TABLE IF NOT EXISTS public.deal_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  drive_file_id text NOT NULL,
  drive_file_name text NOT NULL DEFAULT '',
  drive_file_mime_type text,
  drive_last_modified_at timestamptz,
  drive_folder_id text,
  drive_created_at timestamptz,
  category text,
  storage_bucket_path text,
  json_snapshot_path text,
  checksum text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_files_deal_id ON public.deal_files(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_files_drive_file_id ON public.deal_files(drive_file_id);
CREATE INDEX IF NOT EXISTS idx_deal_files_drive_folder ON public.deal_files(drive_folder_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'deal_files_drive_file_id_unique'
  ) THEN
    ALTER TABLE deal_files
      ADD CONSTRAINT deal_files_drive_file_id_unique UNIQUE (drive_file_id);
  END IF;
END $$;

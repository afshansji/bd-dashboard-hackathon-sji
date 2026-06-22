-- Create deal_files table for storing document metadata linked to deals and clients
CREATE TABLE IF NOT EXISTS public.deal_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  drive_file_id text NOT NULL,
  drive_file_name text NOT NULL,
  drive_file_mime_type text,
  drive_last_modified_at timestamptz,
  storage_bucket_path text,
  json_snapshot_path text,
  checksum text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deal_files_deal_drive_unique UNIQUE (deal_id, drive_file_id)
);

-- Maintain updated_at automatically
CREATE TRIGGER update_deal_files_updated_at
  BEFORE UPDATE ON public.deal_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Helpful indexes for lookups
CREATE INDEX IF NOT EXISTS idx_deal_files_deal_id ON public.deal_files(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_files_client_id ON public.deal_files(client_id);
CREATE INDEX IF NOT EXISTS idx_deal_files_drive_file_id ON public.deal_files(drive_file_id);

-- Enable row level security and scope access to BD/admin aligned users
ALTER TABLE public.deal_files ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'deal_files'
      AND policyname = 'Deal stakeholders and admins can view files'
  ) THEN
    CREATE POLICY "Deal stakeholders and admins can view files"
      ON public.deal_files
      FOR SELECT
      USING (
        auth.uid() IS NOT NULL AND (
          public.has_role(auth.uid(), 'super_admin') OR
          public.has_role(auth.uid(), 'admin') OR
          public.has_role(auth.uid(), 'manager') OR
          public.has_role(auth.uid(), 'project_manager') OR
          EXISTS (
            SELECT 1 FROM public.deals d
            WHERE d.id = deal_files.deal_id
              AND (d.owner_id = auth.uid() OR d.pm_assigned_id = auth.uid())
          )
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'deal_files'
      AND policyname = 'Deal stakeholders and admins can manage files'
  ) THEN
    CREATE POLICY "Deal stakeholders and admins can manage files"
      ON public.deal_files
      FOR INSERT
      WITH CHECK (
        auth.uid() IS NOT NULL AND (
          public.has_role(auth.uid(), 'super_admin') OR
          public.has_role(auth.uid(), 'admin') OR
          public.has_role(auth.uid(), 'manager') OR
          public.has_role(auth.uid(), 'project_manager') OR
          EXISTS (
            SELECT 1 FROM public.deals d
            WHERE d.id = deal_files.deal_id
              AND (d.owner_id = auth.uid() OR d.pm_assigned_id = auth.uid())
          )
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'deal_files'
      AND policyname = 'Deal stakeholders and admins can update files'
  ) THEN
    CREATE POLICY "Deal stakeholders and admins can update files"
      ON public.deal_files
      FOR UPDATE
      USING (
        auth.uid() IS NOT NULL AND (
          public.has_role(auth.uid(), 'super_admin') OR
          public.has_role(auth.uid(), 'admin') OR
          public.has_role(auth.uid(), 'manager') OR
          public.has_role(auth.uid(), 'project_manager') OR
          EXISTS (
            SELECT 1 FROM public.deals d
            WHERE d.id = deal_files.deal_id
              AND (d.owner_id = auth.uid() OR d.pm_assigned_id = auth.uid())
          )
        )
      )
      WITH CHECK (
        auth.uid() IS NOT NULL AND (
          public.has_role(auth.uid(), 'super_admin') OR
          public.has_role(auth.uid(), 'admin') OR
          public.has_role(auth.uid(), 'manager') OR
          public.has_role(auth.uid(), 'project_manager') OR
          EXISTS (
            SELECT 1 FROM public.deals d
            WHERE d.id = deal_files.deal_id
              AND (d.owner_id = auth.uid() OR d.pm_assigned_id = auth.uid())
          )
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'deal_files'
      AND policyname = 'Admins can delete deal files'
  ) THEN
    CREATE POLICY "Admins can delete deal files"
      ON public.deal_files
      FOR DELETE
      USING (
        auth.uid() IS NOT NULL AND (
          public.has_role(auth.uid(), 'super_admin') OR
          public.has_role(auth.uid(), 'admin')
        )
      );
  END IF;
END $$;

-- Ensure private storage bucket for deal files exists
INSERT INTO storage.buckets (id, name, public)
SELECT 'deal-files', 'deal-files', false
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'deal-files'
);

-- Storage policies granting access to BD/admin roles only
CREATE POLICY IF NOT EXISTS "BD team can upload deal files"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'deal-files'
    AND owner = auth.uid()
    AND (
      public.has_role(auth.uid(), 'super_admin') OR
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'manager') OR
      public.has_role(auth.uid(), 'project_manager')
    )
  );

CREATE POLICY IF NOT EXISTS "BD team can manage deal files"
  ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'deal-files'
    AND owner = auth.uid()
    AND (
      public.has_role(auth.uid(), 'super_admin') OR
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'manager') OR
      public.has_role(auth.uid(), 'project_manager')
    )
  )
  WITH CHECK (
    bucket_id = 'deal-files'
    AND owner = auth.uid()
    AND (
      public.has_role(auth.uid(), 'super_admin') OR
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'manager') OR
      public.has_role(auth.uid(), 'project_manager')
    )
  );

CREATE POLICY IF NOT EXISTS "BD team can read deal files"
  ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'deal-files'
    AND (
      owner = auth.uid()
      OR public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'manager')
      OR public.has_role(auth.uid(), 'project_manager')
    )
  );

CREATE POLICY IF NOT EXISTS "Admins can delete deal files from storage"
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'deal-files'
    AND (
      owner = auth.uid()
      OR public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'admin')
    )
  );

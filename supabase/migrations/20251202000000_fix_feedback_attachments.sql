-- Fix feedback attachments table - proper migration syntax
-- Previous migration had invalid "create policy if not exists" syntax

-- 1. Create feedback_attachments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.feedback_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid NOT NULL REFERENCES public.feedback_reports(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  content_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_feedback_attachments_feedback_id 
  ON public.feedback_attachments(feedback_id);

CREATE INDEX IF NOT EXISTS idx_feedback_attachments_created_at 
  ON public.feedback_attachments(created_at DESC);

-- 2. Enable row level security
ALTER TABLE public.feedback_attachments ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view own feedback attachments" ON public.feedback_attachments;
DROP POLICY IF EXISTS "Users can insert feedback attachments" ON public.feedback_attachments;
DROP POLICY IF EXISTS "Service role full access feedback attachments" ON public.feedback_attachments;

-- Policy: Users can view their own feedback attachments
CREATE POLICY "Users can view own feedback attachments"
  ON public.feedback_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.feedback_reports fr
      WHERE fr.id = feedback_attachments.feedback_id
      AND fr.created_by = auth.uid()
    )
  );

-- Policy: Admins can view all feedback attachments
CREATE POLICY "Admins can view all feedback attachments"
  ON public.feedback_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'super_admin')
    )
  );

-- Policy: Users can insert attachments for their own feedback
CREATE POLICY "Users can insert feedback attachments"
  ON public.feedback_attachments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.feedback_reports fr
      WHERE fr.id = feedback_attachments.feedback_id
      AND fr.created_by = auth.uid()
    )
  );

-- Policy: Service role has full access (for edge functions)
CREATE POLICY "Service role full access feedback attachments"
  ON public.feedback_attachments
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 4. Add comments
COMMENT ON TABLE public.feedback_attachments IS 'Stores multiple attachments for feedback reports';
COMMENT ON COLUMN public.feedback_attachments.feedback_id IS 'Reference to the parent feedback report';
COMMENT ON COLUMN public.feedback_attachments.file_path IS 'Path to the file in storage bucket';
COMMENT ON COLUMN public.feedback_attachments.file_name IS 'Original filename';

-- 5. Also ensure the storage bucket exists and has proper policies
-- Note: Storage bucket creation needs to be done via Supabase dashboard or API
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('feedback', 'feedback', false)
-- ON CONFLICT (id) DO NOTHING;


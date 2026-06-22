-- FIX: Feedback Attachments Not Showing
-- Run this SQL in your Supabase SQL Editor (Dashboard > SQL Editor)
-- This creates the missing feedback_attachments table

-- Step 1: Create the feedback_attachments table
CREATE TABLE IF NOT EXISTS public.feedback_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid NOT NULL REFERENCES public.feedback_reports(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  content_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Step 2: Add indexes
CREATE INDEX IF NOT EXISTS idx_feedback_attachments_feedback_id 
  ON public.feedback_attachments(feedback_id);

-- Step 3: Enable RLS
ALTER TABLE public.feedback_attachments ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop and recreate policies (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own feedback attachments" ON public.feedback_attachments;
DROP POLICY IF EXISTS "Admins can view all feedback attachments" ON public.feedback_attachments;
DROP POLICY IF EXISTS "Users can insert feedback attachments" ON public.feedback_attachments;
DROP POLICY IF EXISTS "Service role full access feedback attachments" ON public.feedback_attachments;

-- Users can view their own attachments
CREATE POLICY "Users can view own feedback attachments"
  ON public.feedback_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.feedback_reports fr
      WHERE fr.id = feedback_attachments.feedback_id
      AND fr.created_by = auth.uid()
    )
  );

-- Admins can view all attachments
CREATE POLICY "Admins can view all feedback attachments"
  ON public.feedback_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'super_admin')
    )
  );

-- Users can add attachments to their feedback
CREATE POLICY "Users can insert feedback attachments"
  ON public.feedback_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.feedback_reports fr
      WHERE fr.id = feedback_attachments.feedback_id
      AND fr.created_by = auth.uid()
    )
  );

-- Service role (edge functions) has full access
CREATE POLICY "Service role full access feedback attachments"
  ON public.feedback_attachments FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Step 5: Verify the storage bucket exists
-- Go to Supabase Dashboard > Storage and ensure 'feedback' bucket exists
-- If not, create it as a PRIVATE bucket

SELECT 'SUCCESS: feedback_attachments table created!' as result;


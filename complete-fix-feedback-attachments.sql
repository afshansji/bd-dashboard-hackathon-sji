-- COMPLETE FIX: Feedback Attachments System
-- Run this ENTIRE script in Supabase SQL Editor
-- This will set up everything needed for feedback attachments to work

-- =====================================================
-- PART 1: CREATE THE FEEDBACK_ATTACHMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.feedback_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid NOT NULL REFERENCES public.feedback_reports(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  content_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_feedback_attachments_feedback_id 
  ON public.feedback_attachments(feedback_id);

-- Enable RLS
ALTER TABLE public.feedback_attachments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 2: SET UP RLS POLICIES FOR THE TABLE
-- =====================================================

-- Drop existing policies to recreate them cleanly
DROP POLICY IF EXISTS "Users can view own feedback attachments" ON public.feedback_attachments;
DROP POLICY IF EXISTS "Admins can view all feedback attachments" ON public.feedback_attachments;
DROP POLICY IF EXISTS "Users can insert feedback attachments" ON public.feedback_attachments;
DROP POLICY IF EXISTS "Service role full access feedback attachments" ON public.feedback_attachments;

-- Policy 1: Users can view attachments for their own feedback
CREATE POLICY "Users can view own feedback attachments"
  ON public.feedback_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.feedback_reports fr
      WHERE fr.id = feedback_attachments.feedback_id
      AND fr.created_by = auth.uid()
    )
  );

-- Policy 2: Admins can view all attachments
CREATE POLICY "Admins can view all feedback attachments"
  ON public.feedback_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'super_admin')
    )
  );

-- Policy 3: Users can insert attachments for their own feedback
CREATE POLICY "Users can insert feedback attachments"
  ON public.feedback_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.feedback_reports fr
      WHERE fr.id = feedback_attachments.feedback_id
      AND fr.created_by = auth.uid()
    )
  );

-- Policy 4: Service role has full access (needed for edge functions)
CREATE POLICY "Service role full access feedback attachments"
  ON public.feedback_attachments FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- PART 3: CREATE STORAGE BUCKET IF NOT EXISTS
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'feedback', 
  'feedback', 
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/zip', 'text/x-log']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/zip', 'text/x-log'];

-- =====================================================
-- PART 4: SET UP STORAGE BUCKET POLICIES
-- =====================================================

-- Drop existing storage policies for feedback bucket
DROP POLICY IF EXISTS "Users can upload feedback files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own feedback files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all feedback files" ON storage.objects;
DROP POLICY IF EXISTS "Service role feedback access" ON storage.objects;

-- Policy: Users can upload files to feedback bucket
CREATE POLICY "Users can upload feedback files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'feedback' 
    AND auth.role() = 'authenticated'
  );

-- Policy: Users can view their own feedback files
CREATE POLICY "Users can view own feedback files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'feedback'
    AND auth.role() = 'authenticated'
  );

-- Policy: Users can update their own feedback files
CREATE POLICY "Users can update feedback files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'feedback'
    AND auth.role() = 'authenticated'
  );

-- Policy: Service role has full access to feedback bucket
CREATE POLICY "Service role feedback access"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'feedback'
    AND auth.role() = 'service_role'
  )
  WITH CHECK (
    bucket_id = 'feedback'
    AND auth.role() = 'service_role'
  );

-- =====================================================
-- PART 5: VERIFICATION
-- =====================================================

-- Verify table exists
SELECT 'Table verification:' as check_type, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feedback_attachments') 
            THEN '✅ feedback_attachments table exists' 
            ELSE '❌ table missing' END as result;

-- Verify bucket exists
SELECT 'Bucket verification:' as check_type,
       CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'feedback')
            THEN '✅ feedback bucket exists'
            ELSE '❌ bucket missing' END as result;

-- Count policies
SELECT 'Policy count:' as check_type,
       COUNT(*)::text || ' policies on feedback_attachments' as result
FROM pg_policies WHERE tablename = 'feedback_attachments';

SELECT '✅ SETUP COMPLETE! Try submitting a new feedback with an attachment.' as final_message;


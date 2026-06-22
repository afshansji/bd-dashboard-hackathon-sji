-- Add feedback number, module, and upvote tracking columns
ALTER TABLE public.feedback_reports
  ADD COLUMN IF NOT EXISTS feedback_number SERIAL,
  ADD COLUMN IF NOT EXISTS module TEXT,
  ADD COLUMN IF NOT EXISTS upvote_count INTEGER NOT NULL DEFAULT 0;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_feedback_reports_feedback_number
  ON public.feedback_reports(feedback_number);
CREATE INDEX IF NOT EXISTS idx_feedback_reports_module
  ON public.feedback_reports(module);

-- Create feedback_upvotes table for tracking user upvotes
CREATE TABLE IF NOT EXISTS public.feedback_upvotes (
  feedback_id UUID NOT NULL REFERENCES public.feedback_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (feedback_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_upvotes_user_id
  ON public.feedback_upvotes(user_id);

ALTER TABLE public.feedback_upvotes ENABLE ROW LEVEL SECURITY;

-- Drop old restrictive policies on feedback_reports
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.feedback_reports;
DROP POLICY IF EXISTS "Users can create feedback" ON public.feedback_reports;
DROP POLICY IF EXISTS "Admins can manage all feedback" ON public.feedback_reports;

-- Drop old restrictive policies on feedback_comments
DROP POLICY IF EXISTS "Users can view comments on their feedback" ON public.feedback_comments;
DROP POLICY IF EXISTS "Users can create comments on feedback" ON public.feedback_comments;

-- New transparent policies for feedback_reports
-- All authenticated users can view all feedback
DROP POLICY IF EXISTS "Authenticated users can view feedback" ON public.feedback_reports;
CREATE POLICY "Authenticated users can view feedback"
  ON public.feedback_reports
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

-- Users can create feedback where they are the owner
DROP POLICY IF EXISTS "Authenticated users can insert feedback" ON public.feedback_reports;
CREATE POLICY "Authenticated users can insert feedback"
  ON public.feedback_reports
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- All authenticated users can update any feedback (status, priority)
DROP POLICY IF EXISTS "Authenticated users can update feedback" ON public.feedback_reports;
CREATE POLICY "Authenticated users can update feedback"
  ON public.feedback_reports
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL)
  WITH CHECK (deleted_at IS NULL);

-- Only super_admin can delete feedback
DROP POLICY IF EXISTS "Super admins can delete feedback" ON public.feedback_reports;
CREATE POLICY "Super admins can delete feedback"
  ON public.feedback_reports
  FOR DELETE
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- New transparent policies for feedback_comments
DROP POLICY IF EXISTS "Authenticated users can view feedback comments" ON public.feedback_comments;
CREATE POLICY "Authenticated users can view feedback comments"
  ON public.feedback_comments
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can insert feedback comments" ON public.feedback_comments;
CREATE POLICY "Authenticated users can insert feedback comments"
  ON public.feedback_comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policies for feedback_upvotes
DROP POLICY IF EXISTS "Authenticated users can view feedback upvotes" ON public.feedback_upvotes;
CREATE POLICY "Authenticated users can view feedback upvotes"
  ON public.feedback_upvotes
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can add feedback upvotes" ON public.feedback_upvotes;
CREATE POLICY "Authenticated users can add feedback upvotes"
  ON public.feedback_upvotes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can remove feedback upvotes" ON public.feedback_upvotes;
CREATE POLICY "Authenticated users can remove feedback upvotes"
  ON public.feedback_upvotes
  FOR DELETE
  USING (auth.uid() = user_id);
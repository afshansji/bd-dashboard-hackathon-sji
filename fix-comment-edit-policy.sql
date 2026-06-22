-- FIX: Allow users to edit their own comments
-- Run this SQL in your Supabase SQL Editor (Dashboard > SQL Editor)

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can update own comments" ON public.deal_comments;
DROP POLICY IF EXISTS "Admins can update all comments" ON public.deal_comments;

-- Create UPDATE policy for users to edit their own comments
CREATE POLICY "Users can update own comments"
  ON public.deal_comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Also allow admins to update any comment
CREATE POLICY "Admins can update all comments"
  ON public.deal_comments FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Verify the policies were created
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'deal_comments';

SELECT '✅ Comment edit policy added successfully!' as result;


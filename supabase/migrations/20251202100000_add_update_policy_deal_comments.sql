-- Add UPDATE policy for deal_comments table
-- This was missing from the original migration, causing edit functionality to fail

-- Allow users to update their own comments
CREATE POLICY "Users can update own comments"
  ON public.deal_comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Also allow admins to update any comment
CREATE POLICY "Admins can update all comments"
  ON public.deal_comments FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));


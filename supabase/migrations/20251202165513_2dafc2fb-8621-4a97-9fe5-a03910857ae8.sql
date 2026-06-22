-- Add missing UPDATE policies for deal_comments table

-- Allow users to update their own comments
DROP POLICY IF EXISTS "Users can update own comments" ON public.deal_comments;
CREATE POLICY "Users can update own comments"
  ON public.deal_comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow admins to update any comment
DROP POLICY IF EXISTS "Admins can update all comments" ON public.deal_comments;
CREATE POLICY "Admins can update all comments"
  ON public.deal_comments FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
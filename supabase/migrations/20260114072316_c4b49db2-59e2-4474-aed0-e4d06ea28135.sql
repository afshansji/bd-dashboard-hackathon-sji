-- Fix RLS policies to allow data access
DROP POLICY IF EXISTS "Users can view comments on accessible tasks" ON task_comments;
DROP POLICY IF EXISTS "Users can create comments on accessible tasks" ON task_comments;
DROP POLICY IF EXISTS "Users can view history on accessible tasks" ON task_history;

CREATE POLICY "Authenticated users can view all comments" ON task_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create comments" ON task_comments FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());

-- Ensure update policy exists correctly
DROP POLICY IF EXISTS "Users can update their own comments" ON task_comments;
CREATE POLICY "Users can update their own comments" ON task_comments FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authenticated users can view all history" ON task_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can insert history" ON task_history FOR INSERT TO authenticated WITH CHECK (true);
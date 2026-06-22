-- Add missing delete policy with 1-hour window for task_comments
DROP POLICY IF EXISTS "Users can delete their own comments within 1 hour" ON task_comments;
CREATE POLICY "Users can delete their own comments within 1 hour"
  ON task_comments FOR DELETE
  USING (
    author_id = auth.uid()
    AND created_at > NOW() - INTERVAL '1 hour'
  );

-- Add insert policy for task_history (for system/app inserts)
DROP POLICY IF EXISTS "System can insert history" ON task_history;
CREATE POLICY "Authenticated users can insert history"
  ON task_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add insert policy for notifications
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "Authenticated users can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add insert policy for task_comment_mentions with simpler check
DROP POLICY IF EXISTS "Users can create mentions when commenting" ON task_comment_mentions;
CREATE POLICY "Authenticated users can create mentions"
  ON task_comment_mentions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add view policy for mentions
DROP POLICY IF EXISTS "Users can view mentions in accessible comments" ON task_comment_mentions;
CREATE POLICY "Authenticated users can view mentions"
  ON task_comment_mentions FOR SELECT
  TO authenticated
  USING (true);

-- Ensure update trigger exists for task_comments
CREATE OR REPLACE FUNCTION update_task_comment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.edited = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS task_comments_updated_at ON task_comments;
CREATE TRIGGER task_comments_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_task_comment_updated_at();
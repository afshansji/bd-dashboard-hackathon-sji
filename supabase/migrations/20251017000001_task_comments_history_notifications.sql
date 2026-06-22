-- Task Comments, History, and Notifications System
-- Adds comprehensive commenting, audit logging, and notification capabilities to tasks

-- =====================================================
-- PART 1: TASK COMMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  edited BOOLEAN DEFAULT false
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_author_id ON task_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON task_comments(created_at DESC);

-- Enable RLS
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_comments
CREATE POLICY "Users can view comments on accessible tasks"
  ON task_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_tasks pt
      WHERE pt.id = task_comments.task_id
      AND (
        pt.assigned_to = auth.uid()
        OR pt.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role IN ('super_admin', 'admin', 'manager')
        )
      )
    )
  );

CREATE POLICY "Users can create comments on accessible tasks"
  ON task_comments FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM project_tasks pt
      WHERE pt.id = task_comments.task_id
      AND (
        pt.assigned_to = auth.uid()
        OR pt.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role IN ('super_admin', 'admin', 'manager')
        )
      )
    )
  );

CREATE POLICY "Users can update their own comments"
  ON task_comments FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- =====================================================
-- PART 2: TASK COMMENT MENTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS task_comment_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES task_comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(comment_id, mentioned_user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_comment_mentions_comment_id ON task_comment_mentions(comment_id);
CREATE INDEX IF NOT EXISTS idx_task_comment_mentions_mentioned_user_id ON task_comment_mentions(mentioned_user_id);

-- Enable RLS
ALTER TABLE task_comment_mentions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_comment_mentions
CREATE POLICY "Users can view mentions in accessible comments"
  ON task_comment_mentions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM task_comments tc
      JOIN project_tasks pt ON tc.task_id = pt.id
      WHERE tc.id = task_comment_mentions.comment_id
      AND (
        pt.assigned_to = auth.uid()
        OR pt.created_by = auth.uid()
        OR mentioned_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role IN ('super_admin', 'admin', 'manager')
        )
      )
    )
  );

CREATE POLICY "Users can create mentions when commenting"
  ON task_comment_mentions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM task_comments tc
      WHERE tc.id = task_comment_mentions.comment_id
      AND tc.author_id = auth.uid()
    )
  );

-- =====================================================
-- PART 3: TASK HISTORY (AUDIT LOG) TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS task_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL, -- 'create', 'update', 'delete'
  field_name TEXT, -- e.g. 'status', 'assignee', 'labels'
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_history_created_at ON task_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_history_actor_id ON task_history(actor_id);

-- Enable RLS
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_history
CREATE POLICY "Users can view history on accessible tasks"
  ON task_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_tasks pt
      WHERE pt.id = task_history.task_id
      AND (
        pt.assigned_to = auth.uid()
        OR pt.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role IN ('super_admin', 'admin', 'manager')
        )
      )
    )
  );

-- History entries are created automatically by the application
-- No INSERT/UPDATE policies needed for end users

-- =====================================================
-- PART 4: NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'TASK_MENTION', 'TASK_ASSIGNEE_CHANGED', etc.
  task_id UUID REFERENCES project_tasks(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES task_comments(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT,
  link_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- PART 5: HELPER FUNCTION FOR UPDATED_AT
-- =====================================================

-- Update updated_at timestamp for task_comments
CREATE OR REPLACE FUNCTION update_task_comment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.edited = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_comments_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_task_comment_updated_at();

-- =====================================================
-- PART 6: COMMENTS
-- =====================================================

COMMENT ON TABLE task_comments IS 'Comments on project tasks with @mention support';
COMMENT ON TABLE task_comment_mentions IS 'Tracks @mentions in task comments';
COMMENT ON TABLE task_history IS 'Audit log of task changes for history timeline';
COMMENT ON TABLE notifications IS 'In-app notifications for task mentions and assignments';

COMMENT ON COLUMN task_comments.body_text IS 'Comment text with mention tokens: @[Name](userId)';
COMMENT ON COLUMN task_comments.edited IS 'Flag to indicate if comment was edited after creation';
COMMENT ON COLUMN task_history.action_type IS 'Type of action: create, update, delete';
COMMENT ON COLUMN task_history.field_name IS 'Name of field that changed (e.g., status, assignee)';
COMMENT ON COLUMN notifications.type IS 'Notification type: TASK_MENTION, TASK_ASSIGNEE_CHANGED';
COMMENT ON COLUMN notifications.read_at IS 'Timestamp when notification was marked as read (NULL = unread)';


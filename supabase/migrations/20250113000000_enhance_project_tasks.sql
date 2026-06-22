-- Enhanced Project Tasks Migration
-- Adds support for campaign association, labels, attachments, Google Drive folders, and optional links

-- =====================================================
-- PART 1: ALTER project_tasks TABLE
-- =====================================================

-- Campaign association
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS is_campaign_associated BOOLEAN DEFAULT false;
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES bd_campaigns(id) ON DELETE SET NULL;

-- Google Drive folder (stored as JSONB)
-- Structure: { id: string, name?: string, url?: string }
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS google_folder JSONB DEFAULT NULL;

-- Optional reference links
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS active_collab_link TEXT;
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS workboard_ai_link TEXT;
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS reference_url TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_tasks_assigned_to ON project_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_project_tasks_campaign_id ON project_tasks(campaign_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_status ON project_tasks(status);

-- =====================================================
-- PART 2: CREATE task_labels TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS task_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE task_labels ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_labels
CREATE POLICY IF NOT EXISTS "Authenticated users can view task labels"
  ON task_labels FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS "Authenticated users can create task labels"
  ON task_labels FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- PART 3: CREATE project_task_labels JUNCTION TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS project_task_labels (
  task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES task_labels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (task_id, label_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_project_task_labels_task_id ON project_task_labels(task_id);
CREATE INDEX IF NOT EXISTS idx_project_task_labels_label_id ON project_task_labels(label_id);

-- Enable RLS
ALTER TABLE project_task_labels ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_task_labels
CREATE POLICY IF NOT EXISTS "Users can view task label associations"
  ON project_task_labels FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS "Users can manage task label associations"
  ON project_task_labels FOR ALL
  USING (auth.uid() IS NOT NULL);

-- =====================================================
-- PART 4: CREATE task_attachments TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);

-- Enable RLS
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_attachments
CREATE POLICY IF NOT EXISTS "Users can view task attachments"
  ON task_attachments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS "Users can upload task attachments"
  ON task_attachments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND uploaded_by = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can delete their own task attachments"
  ON task_attachments FOR DELETE
  USING (auth.uid() IS NOT NULL AND uploaded_by = auth.uid());

-- =====================================================
-- PART 5: CREATE STORAGE BUCKET FOR TASK FILES
-- =====================================================

-- Create storage bucket for task files if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
SELECT 'task-files', 'task-files', false
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'task-files'
);

-- Storage policies for task-files bucket
CREATE POLICY IF NOT EXISTS "Authenticated users can upload task files"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'task-files'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY IF NOT EXISTS "Authenticated users can view task files"
  ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'task-files'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY IF NOT EXISTS "Users can update their own task files"
  ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'task-files'
    AND owner = auth.uid()
  )
  WITH CHECK (
    bucket_id = 'task-files'
    AND owner = auth.uid()
  );

CREATE POLICY IF NOT EXISTS "Users can delete their own task files"
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'task-files'
    AND owner = auth.uid()
  );

-- =====================================================
-- PART 6: ADD HELPFUL COMMENTS
-- =====================================================

COMMENT ON COLUMN project_tasks.is_campaign_associated IS 'Whether this task is associated with a BD campaign';
COMMENT ON COLUMN project_tasks.campaign_id IS 'Reference to associated BD campaign';
COMMENT ON COLUMN project_tasks.google_folder IS 'Google Drive folder metadata: {id, name, url}';
COMMENT ON COLUMN project_tasks.active_collab_link IS 'Link to ActiveCollab task';
COMMENT ON COLUMN project_tasks.workboard_ai_link IS 'Link to Workboard AI task';
COMMENT ON COLUMN project_tasks.reference_url IS 'Generic reference URL';

COMMENT ON TABLE task_labels IS 'Reusable labels/tags for tasks';
COMMENT ON TABLE project_task_labels IS 'Many-to-many relationship between tasks and labels';
COMMENT ON TABLE task_attachments IS 'File attachments for tasks';


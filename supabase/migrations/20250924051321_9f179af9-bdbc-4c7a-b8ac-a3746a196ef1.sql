-- Remove the time tracking tables since we'll import hours from external software
DROP TABLE IF EXISTS time_tracking_sessions;
DROP TABLE IF EXISTS time_entries;

-- Ensure we have the necessary hour fields on existing tables
-- project_tasks already has estimated_hours and actual_hours
-- Let's add a few more fields for imported data tracking

ALTER TABLE project_tasks 
ADD COLUMN IF NOT EXISTS imported_hours numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_hours_import timestamp with time zone,
ADD COLUMN IF NOT EXISTS external_task_id text;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS total_logged_hours numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_hours_import timestamp with time zone,
ADD COLUMN IF NOT EXISTS external_project_id text;

-- Create indexes for better performance on external IDs
CREATE INDEX IF NOT EXISTS idx_project_tasks_external_id ON project_tasks(external_task_id);
CREATE INDEX IF NOT EXISTS idx_projects_external_id ON projects(external_project_id);
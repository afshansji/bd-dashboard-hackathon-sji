-- Add missing columns to project_tasks table for enhanced task features
ALTER TABLE public.project_tasks 
ADD COLUMN IF NOT EXISTS is_campaign_associated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES bd_campaigns(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS google_folder jsonb,
ADD COLUMN IF NOT EXISTS active_collab_link text,
ADD COLUMN IF NOT EXISTS workboard_ai_link text,
ADD COLUMN IF NOT EXISTS reference_url text;

-- Add index for campaign association lookups
CREATE INDEX IF NOT EXISTS idx_project_tasks_campaign_id ON project_tasks(campaign_id) WHERE campaign_id IS NOT NULL;
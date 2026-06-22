-- Extend lead_import_jobs table to support Google Sheets imports and rollback tracking
ALTER TABLE lead_import_jobs 
  ADD COLUMN IF NOT EXISTS import_source TEXT DEFAULT 'exa',
  ADD COLUMN IF NOT EXISTS sheet_url TEXT,
  ADD COLUMN IF NOT EXISTS field_mapping JSONB,
  ADD COLUMN IF NOT EXISTS validation_results JSONB,
  ADD COLUMN IF NOT EXISTS rollback_data JSONB,
  ADD COLUMN IF NOT EXISTS is_rolled_back BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rolled_back_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS rolled_back_by UUID,
  ADD COLUMN IF NOT EXISTS skipped_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duplicate_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_import_jobs_campaign ON lead_import_jobs(campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_jobs_user ON lead_import_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON lead_import_jobs(status);

-- Add RLS policy for viewing import history
CREATE POLICY "Users can view their campaign imports" ON lead_import_jobs
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM bd_campaigns 
      WHERE bd_campaigns.id = lead_import_jobs.campaign_id 
      AND (bd_campaigns.created_by = auth.uid() OR bd_campaigns.owned_by = auth.uid())
    ) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );
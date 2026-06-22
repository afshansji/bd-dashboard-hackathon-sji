-- Extend lead_import_jobs table for campaign support
ALTER TABLE lead_import_jobs 
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES bd_campaigns(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS job_type TEXT DEFAULT 'global',
  ADD COLUMN IF NOT EXISTS notify_email TEXT,
  ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add check constraint for job_type
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lead_import_jobs_job_type_check'
  ) THEN
    ALTER TABLE lead_import_jobs 
      ADD CONSTRAINT lead_import_jobs_job_type_check 
      CHECK (job_type IN ('global', 'campaign'));
  END IF;
END $$;

-- Index for campaign lookups
CREATE INDEX IF NOT EXISTS idx_lead_import_jobs_campaign 
  ON lead_import_jobs(campaign_id) 
  WHERE campaign_id IS NOT NULL;

-- Index for pending job processing
CREATE INDEX IF NOT EXISTS idx_lead_import_jobs_pending 
  ON lead_import_jobs(status, created_at) 
  WHERE status IN ('queued', 'processing');

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_lead_import_jobs_user 
  ON lead_import_jobs(user_id) 
  WHERE user_id IS NOT NULL;

-- Enable realtime for lead_import_jobs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'lead_import_jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_import_jobs;
  END IF;
END $$;

-- RLS Policies for lead_import_jobs
ALTER TABLE lead_import_jobs ENABLE ROW LEVEL SECURITY;

-- Users can view their own import jobs or jobs for campaigns they own
DROP POLICY IF EXISTS "Users can view own import jobs" ON lead_import_jobs;
CREATE POLICY "Users can view own import jobs"
ON lead_import_jobs FOR SELECT
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM bd_campaigns
    WHERE id = lead_import_jobs.campaign_id
    AND (created_by = auth.uid() OR owned_by = auth.uid())
  )
);

-- Only service role can insert/update (via edge functions)
DROP POLICY IF EXISTS "Service role can manage jobs" ON lead_import_jobs;
CREATE POLICY "Service role can manage jobs"
ON lead_import_jobs FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
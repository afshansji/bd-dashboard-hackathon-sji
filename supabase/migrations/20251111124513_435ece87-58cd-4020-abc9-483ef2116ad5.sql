-- Create sync status tracking table
CREATE TABLE IF NOT EXISTS public.hubspot_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL DEFAULT 'full', -- 'full', 'deals-only'
  status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed', 'failed'
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  total_items_synced INTEGER DEFAULT 0,
  companies_synced INTEGER DEFAULT 0,
  contacts_synced INTEGER DEFAULT 0,
  deals_synced INTEGER DEFAULT 0,
  error_message TEXT,
  triggered_by TEXT, -- 'manual', 'webhook', 'cron'
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_hubspot_sync_status_status ON hubspot_sync_status(status);
CREATE INDEX idx_hubspot_sync_status_started_at ON hubspot_sync_status(started_at DESC);

-- RLS Policies
ALTER TABLE hubspot_sync_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view sync status"
  ON hubspot_sync_status FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage sync status"
  ON hubspot_sync_status FOR ALL
  USING (auth.role() = 'service_role');

-- Updated at trigger
CREATE TRIGGER set_hubspot_sync_status_updated_at
  BEFORE UPDATE ON hubspot_sync_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
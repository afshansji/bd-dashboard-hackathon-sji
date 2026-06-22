-- Create control_tower_sync_state table to track last sync timestamp
CREATE TABLE IF NOT EXISTS public.control_tower_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  last_successful_sync_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_sync_status TEXT NOT NULL DEFAULT 'success',
  last_sync_error TEXT,
  deals_synced INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert initial record
INSERT INTO public.control_tower_sync_state (last_successful_sync_at, last_sync_status)
VALUES (NOW() - INTERVAL '24 hours', 'success')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.control_tower_sync_state ENABLE ROW LEVEL SECURITY;

-- Admins can view sync state
CREATE POLICY "Admins can view sync state"
  ON public.control_tower_sync_state
  FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin') OR 
    has_role(auth.uid(), 'admin')
  );

-- System can update sync state
CREATE POLICY "System can update sync state"
  ON public.control_tower_sync_state
  FOR UPDATE
  USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sync_state_timestamp 
  ON public.control_tower_sync_state(last_successful_sync_at DESC);

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job to sync deals hourly (incremental mode)
SELECT cron.schedule(
  'sync-control-tower-deals-incremental',
  '0 * * * *', -- Every hour at :00
  $$
  SELECT net.http_post(
    url:='https://qzzvcqoletuummdsbbio.supabase.co/functions/v1/sync-control-tower-deals',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body:=jsonb_build_object(
      'mode', 'incremental',
      'cron', true
    )
  ) AS request_id;
  $$
);
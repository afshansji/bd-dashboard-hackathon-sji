-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to cleanup old sync logs (older than 20 minutes)
CREATE OR REPLACE FUNCTION public.cleanup_old_sync_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM control_tower_sync_log
  WHERE synced_at < NOW() - INTERVAL '20 minutes';
END;
$$;

-- Schedule the cleanup to run every 5 minutes
SELECT cron.schedule(
  'cleanup-sync-logs-every-5-minutes',
  '*/5 * * * *', -- every 5 minutes
  $$
  SELECT public.cleanup_old_sync_logs();
  $$
);
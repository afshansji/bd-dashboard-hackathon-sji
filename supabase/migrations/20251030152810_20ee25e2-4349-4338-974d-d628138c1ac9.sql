-- Phase 4: Add hourly cron job to push checklist completion updates to Control Tower
-- This runs at :35 every hour (5 minutes after deal fields push)

SELECT cron.schedule(
  'push-control-tower-checklist',
  '35 * * * *', -- Every hour at :35 (after pull at :00 and push deal fields at :30)
  $$
  SELECT net.http_post(
    url:='https://qzzvcqoletuummdsbbio.supabase.co/functions/v1/push-to-control-tower',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body:=jsonb_build_object(
      'entity_type', 'checklist'
    )
  );
  $$
);
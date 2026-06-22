-- Add hourly cron job to push deal field updates to Control Tower
-- This runs 30 minutes offset from the pull sync to avoid conflicts

SELECT cron.schedule(
  'push-control-tower-deal-fields',
  '30 * * * *', -- Every hour at :30 (offset from pull sync at :00)
  $$
  SELECT net.http_post(
    url:='https://qzzvcqoletuummdsbbio.supabase.co/functions/v1/push-to-control-tower',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body:=jsonb_build_object(
      'entity_type', 'deal_fields'
    )
  );
  $$
);
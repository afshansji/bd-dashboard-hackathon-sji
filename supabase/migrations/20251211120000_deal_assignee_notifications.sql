-- Deal Assignee Notifications
-- This migration creates a trigger to send email notifications when a deal assignee is changed

-- Ensure pg_net extension is enabled for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to notify on deal assignee changes
CREATE OR REPLACE FUNCTION notify_deal_assignee_change()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
  request_id BIGINT;
BEGIN
  -- Get configuration
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);

  -- Fallback to env if settings not available
  IF supabase_url IS NULL OR supabase_url = '' THEN
    supabase_url := 'https://qzzvcqoletuummdsbbio.supabase.co';
  END IF;

  -- Check if PM assignee changed and new assignee is not null
  IF (TG_OP = 'UPDATE' AND
      (OLD.pm_assigned_id IS DISTINCT FROM NEW.pm_assigned_id) AND
      NEW.pm_assigned_id IS NOT NULL) THEN

    -- Make async HTTP request to edge function
    SELECT net.http_post(
      url := supabase_url || '/functions/v1/deal-assignee-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(service_role_key, current_setting('app.settings.service_role_key', true))
      ),
      body := jsonb_build_object(
        'deal_id', NEW.id,
        'new_assignee_id', NEW.pm_assigned_id,
        'old_assignee_id', OLD.pm_assigned_id,
        'assignment_type', 'pm',
        'changed_by_id', COALESCE(auth.uid()::text, NULL)
      )
    ) INTO request_id;

    RAISE LOG '[deal-assignee-notification] PM assignment notification queued for deal %, request_id: %', NEW.id, request_id;
  END IF;

  -- Check if Owner changed and new owner is not null
  IF (TG_OP = 'UPDATE' AND
      (OLD.owner_id IS DISTINCT FROM NEW.owner_id) AND
      NEW.owner_id IS NOT NULL) THEN

    -- Make async HTTP request to edge function
    SELECT net.http_post(
      url := supabase_url || '/functions/v1/deal-assignee-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(service_role_key, current_setting('app.settings.service_role_key', true))
      ),
      body := jsonb_build_object(
        'deal_id', NEW.id,
        'new_assignee_id', NEW.owner_id,
        'old_assignee_id', OLD.owner_id,
        'assignment_type', 'owner',
        'changed_by_id', COALESCE(auth.uid()::text, NULL)
      )
    ) INTO request_id;

    RAISE LOG '[deal-assignee-notification] Owner assignment notification queued for deal %, request_id: %', NEW.id, request_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists (to allow re-running this migration)
DROP TRIGGER IF EXISTS trigger_deal_assignee_notification ON deals;

-- Create trigger to fire on deal updates
CREATE TRIGGER trigger_deal_assignee_notification
AFTER UPDATE ON deals
FOR EACH ROW
EXECUTE FUNCTION notify_deal_assignee_change();

-- Add comment for documentation
COMMENT ON FUNCTION notify_deal_assignee_change() IS 'Sends email notification when a deal PM or owner assignment changes';
COMMENT ON TRIGGER trigger_deal_assignee_notification ON deals IS 'Fires after deal update to send assignee change notifications';

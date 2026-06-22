-- Alternative Trigger Implementation for Lovable Managed Database
-- This version works without requiring database configuration of service_role_key

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_deal_assignee_notification ON deals;
DROP FUNCTION IF EXISTS notify_deal_assignee_change();

-- Create improved function that works with Lovable's environment
CREATE OR REPLACE FUNCTION notify_deal_assignee_change()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url TEXT;
  request_id BIGINT;
  auth_header TEXT;
BEGIN
  -- Get Supabase URL (with fallback)
  supabase_url := COALESCE(
    current_setting('app.settings.supabase_url', true),
    'https://qzzvcqoletuummdsbbio.supabase.co'
  );

  -- Try to get service role key from multiple sources
  -- This will work if Lovable has configured database settings
  BEGIN
    auth_header := 'Bearer ' || COALESCE(
      get_service_role_key(),
      current_setting('app.settings.service_role_key', true),
      '' -- Empty as last resort - edge function will handle validation
    );
  EXCEPTION WHEN OTHERS THEN
    -- If all fails, use empty auth (edge function should still create in-app notifications)
    auth_header := 'Bearer ';
    RAISE LOG '[deal-assignee-notification] Warning: No service role key available, auth may fail';
  END;

  -- Check if PM assignee changed and new assignee is not null
  IF (TG_OP = 'UPDATE' AND
      (OLD.pm_assigned_id IS DISTINCT FROM NEW.pm_assigned_id) AND
      NEW.pm_assigned_id IS NOT NULL) THEN

    -- Make async HTTP request to edge function
    BEGIN
      SELECT net.http_post(
        url := supabase_url || '/functions/v1/deal-assignee-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', auth_header
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
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG '[deal-assignee-notification] Failed to queue PM notification: %', SQLERRM;
    END;
  END IF;

  -- Check if Owner changed and new owner is not null
  IF (TG_OP = 'UPDATE' AND
      (OLD.owner_id IS DISTINCT FROM NEW.owner_id) AND
      NEW.owner_id IS NOT NULL) THEN

    -- Make async HTTP request to edge function
    BEGIN
      SELECT net.http_post(
        url := supabase_url || '/functions/v1/deal-assignee-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', auth_header
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
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG '[deal-assignee-notification] Failed to queue owner notification: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER trigger_deal_assignee_notification
AFTER UPDATE ON deals
FOR EACH ROW
EXECUTE FUNCTION notify_deal_assignee_change();

-- Add comment
COMMENT ON FUNCTION notify_deal_assignee_change() IS 'Sends notifications when deal PM or owner changes. Works with Lovable managed databases.';

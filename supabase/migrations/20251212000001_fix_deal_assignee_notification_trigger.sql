-- Fix Deal Assignee Notification Trigger to properly retrieve service role key
-- This migration updates the trigger to use the get_service_role_key() helper function

-- Drop and recreate the function with improved error handling and key retrieval
CREATE OR REPLACE FUNCTION notify_deal_assignee_change()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
  request_id BIGINT;
BEGIN
  -- Get Supabase URL
  supabase_url := current_setting('app.settings.supabase_url', true);

  -- Fallback to hardcoded URL if settings not available
  IF supabase_url IS NULL OR supabase_url = '' THEN
    supabase_url := 'https://qzzvcqoletuummdsbbio.supabase.co';
  END IF;

  -- Get service role key using helper function (tries vault first, then database config)
  service_role_key := get_service_role_key();

  -- Validate we have a service role key
  IF service_role_key IS NULL OR service_role_key = '' THEN
    RAISE WARNING '[deal-assignee-notification] Service role key not configured. Notification will not be sent. Please configure using vault or database settings.';
    RETURN NEW;
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
        'Authorization', 'Bearer ' || service_role_key
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
        'Authorization', 'Bearer ' || service_role_key
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

-- Update function comment
COMMENT ON FUNCTION notify_deal_assignee_change() IS 'Sends email notification when a deal PM or owner assignment changes. Uses get_service_role_key() for secure key retrieval.';

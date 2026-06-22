# Deal Owner/PM Notification Setup

## Problem

Deal owner and PM assignee change notifications were not being sent because the database trigger (`notify_deal_assignee_change()`) could not authenticate requests to the edge function. The trigger was trying to use database configuration settings (`app.settings.service_role_key`) that were never configured, resulting in failed HTTP requests with invalid authentication headers.

## Root Cause

The database trigger needs to call the `deal-assignee-notification` edge function via HTTP, which requires authentication. The trigger was attempting to retrieve the service role key from database settings, but these settings were not configured anywhere in the migrations.

## Solution

We've implemented a two-part fix:

### 1. Created Helper Function (`get_service_role_key()`)

A new function that retrieves the service role key from multiple sources in order of preference:
- **Supabase Vault** (most secure, recommended)
- **Database configuration settings** (fallback)

Migration: `20251212000000_configure_database_settings.sql`

### 2. Updated Trigger Function

Updated the `notify_deal_assignee_change()` trigger to:
- Use the new `get_service_role_key()` helper function
- Add proper validation and error logging
- Gracefully handle missing configuration

Migration: `20251212000001_fix_deal_assignee_notification_trigger.sql`

## Setup Instructions

After deploying the migrations, you must configure the service role key:

### Option 1: Using Supabase Vault (Recommended)

1. Go to Supabase Dashboard > SQL Editor
2. Run the following command (replace with your actual service role key):

```sql
SELECT vault.create_secret('YOUR_SERVICE_ROLE_KEY_HERE', 'service_role_key');
```

To find your service role key:
- Supabase Dashboard > Project Settings > API > service_role key

### Option 2: Using Database Configuration

1. Go to Supabase Dashboard > SQL Editor
2. Run the following commands:

```sql
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://qzzvcqoletuummdsbbio.supabase.co';
ALTER DATABASE postgres SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY_HERE';
```

**Note:** Method 1 (Vault) is more secure as it encrypts the secret.

### Verification

After configuration, verify it's working:

```sql
-- Check if service role key is available
SELECT get_service_role_key() IS NOT NULL as configured;

-- Should return: configured = true
```

### Testing

Test the notification by changing a deal owner:

```sql
UPDATE deals
SET owner_id = 'some-user-id'
WHERE id = 'some-deal-id';
```

Check the Supabase logs:
- Go to Supabase Dashboard > Logs > Postgres Logs
- Look for entries like: `[deal-assignee-notification] Owner assignment notification queued for deal ...`
- Check Edge Function logs for the actual email sending

## Files Changed

- `supabase/migrations/20251212000000_configure_database_settings.sql` - Creates vault extension and helper function
- `supabase/migrations/20251212000001_fix_deal_assignee_notification_trigger.sql` - Updates trigger function
- `supabase/setup_database_config.sql` - Manual setup script with instructions

## Security Notes

- **Never commit the actual service role key to version control**
- The `setup_database_config.sql` file contains only placeholders
- Use Supabase Vault when possible for encrypted secret storage
- The service role key has full database access - protect it carefully

## Related Files

- Trigger: `supabase/migrations/20251211120000_deal_assignee_notifications.sql`
- Edge Function: `supabase/functions/deal-assignee-notification/index.ts`
- User Settings UI: `src/pages/bd/UserSettings.tsx`

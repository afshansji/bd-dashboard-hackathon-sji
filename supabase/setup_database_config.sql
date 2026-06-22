-- ============================================================================
-- Database Configuration Setup Script
-- ============================================================================
--
-- This script must be run manually in the Supabase SQL Editor to configure
-- the database settings required for edge function calls from triggers.
--
-- IMPORTANT: This file contains placeholders. Replace with actual values from
-- your Supabase project settings before running.
--
-- To find your Service Role Key:
-- 1. Go to Supabase Dashboard: https://app.supabase.com
-- 2. Select your project
-- 3. Go to Settings > API
-- 4. Copy the "service_role" key (NOT the anon/public key)
--
-- SECURITY WARNING: Never commit this file with actual secrets!
-- ============================================================================

-- Method 1: Using Database Configuration (simpler, less secure)
-- Uncomment and replace with actual values:

-- ALTER DATABASE postgres SET app.settings.supabase_url = 'https://qzzvcqoletuummdsbbio.supabase.co';
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY_HERE';

-- Method 2: Using Supabase Vault (recommended, more secure)
-- Uncomment and replace with actual value:

-- SELECT vault.create_secret('YOUR_SERVICE_ROLE_KEY_HERE', 'service_role_key');

-- ============================================================================
-- Verification
-- ============================================================================
-- After running one of the methods above, verify the configuration:

-- For Method 1 (Database Configuration):
SELECT
  CASE
    WHEN current_setting('app.settings.service_role_key', true) IS NOT NULL
    THEN '✓ Service role key configured'
    ELSE '✗ Service role key NOT configured'
  END as service_key_status,
  CASE
    WHEN current_setting('app.settings.supabase_url', true) IS NOT NULL
    THEN '✓ Supabase URL configured'
    ELSE '✗ Supabase URL NOT configured'
  END as url_status;

-- For Method 2 (Vault):
-- SELECT
--   CASE
--     WHEN get_service_role_key() IS NOT NULL
--     THEN '✓ Service role key available from vault'
--     ELSE '✗ Service role key NOT available'
--   END as vault_status;

-- ============================================================================
-- Test the Trigger
-- ============================================================================
-- After configuration, you can test by updating a deal owner:

-- UPDATE deals
-- SET owner_id = 'SOME_USER_ID'
-- WHERE id = 'SOME_DEAL_ID';

-- Check the logs to see if the trigger fired:
-- You should see log entries like:
-- [deal-assignee-notification] Owner assignment notification queued for deal ...

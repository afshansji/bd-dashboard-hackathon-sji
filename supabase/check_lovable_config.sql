-- Lovable Managed Database Configuration Check
-- This script checks if the database settings are already configured
-- and provides alternative solutions for Lovable-managed environments

-- ============================================================================
-- STEP 1: Check if settings are already configured by Lovable
-- ============================================================================

SELECT
  CASE
    WHEN current_setting('app.settings.service_role_key', true) IS NOT NULL
    THEN '✓ Service role key is configured'
    ELSE '✗ Service role key NOT configured'
  END as service_key_status,
  CASE
    WHEN current_setting('app.settings.supabase_url', true) IS NOT NULL
    THEN '✓ Supabase URL is configured'
    ELSE '✗ Supabase URL NOT configured'
  END as url_status;

-- ============================================================================
-- STEP 2: Check if the helper function works
-- ============================================================================

SELECT
  CASE
    WHEN get_service_role_key() IS NOT NULL
    THEN '✓ get_service_role_key() returns a value'
    ELSE '✗ get_service_role_key() returns NULL'
  END as function_status;

-- ============================================================================
-- STEP 3: Test the trigger manually (OPTIONAL - only if settings exist)
-- ============================================================================

-- Uncomment and run this to test if the trigger can call the edge function:
--
-- UPDATE deals
-- SET owner_id = owner_id  -- This triggers the notification without actually changing the owner
-- WHERE id = 'YOUR_DEAL_ID_HERE'
-- LIMIT 1;
--
-- Then check the Supabase logs to see if the edge function was called

-- ============================================================================
-- ALTERNATIVE SOLUTION FOR LOVABLE:
-- Use environment variable injection via Lovable's platform
-- ============================================================================

-- If the above checks show NULL, you need to configure through Lovable's dashboard
--
-- Go to: Lovable Dashboard → Your Project → Settings → Environment Variables
--
-- Look for or add these variables:
-- - SUPABASE_SERVICE_ROLE_KEY (should already exist for edge functions)
-- - SUPABASE_URL (should already exist)
--
-- Then check with Lovable support if database-level settings can be configured

-- ============================================================================
-- FALLBACK: Use simpler authentication method
-- ============================================================================

-- If you cannot access the service role key, we can modify the trigger
-- to use a simpler approach. This would require updating the edge function
-- to validate requests differently (e.g., using a webhook secret).

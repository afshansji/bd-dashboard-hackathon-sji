-- Configure database settings for edge function calls from triggers
-- This migration sets up the required configuration for database triggers to call edge functions

-- NOTE: For security, these values should be set using Supabase CLI or Dashboard after deployment
-- This migration provides a template for the required configuration

-- Option 1: Set via ALTER DATABASE (recommended for production)
-- These commands should be run manually with actual values from Supabase project settings
-- DO NOT commit actual secrets to version control

-- To configure manually, run these commands in your Supabase SQL Editor:
-- ALTER DATABASE postgres SET app.settings.supabase_url = 'https://qzzvcqoletuummdsbbio.supabase.co';
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'your-actual-service-role-key-here';

-- Option 2: Use Supabase Vault (more secure, recommended)
-- Enable vault extension
CREATE EXTENSION IF NOT EXISTS vault WITH SCHEMA vault CASCADE;

-- Create a helper function to retrieve service role key from vault
CREATE OR REPLACE FUNCTION get_service_role_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  service_key TEXT;
BEGIN
  -- Try to get from vault first
  BEGIN
    SELECT decrypted_secret INTO service_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
    LIMIT 1;

    IF service_key IS NOT NULL AND service_key != '' THEN
      RETURN service_key;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Could not retrieve from vault: %', SQLERRM;
  END;

  -- Fallback to database configuration
  BEGIN
    service_key := current_setting('app.settings.service_role_key', true);
    IF service_key IS NOT NULL AND service_key != '' THEN
      RETURN service_key;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Could not retrieve from database settings: %', SQLERRM;
  END;

  -- If all else fails, return NULL and log error
  RAISE WARNING 'Service role key not configured. Please set up vault secret or database configuration.';
  RETURN NULL;
END;
$$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION get_service_role_key() TO authenticated, service_role;

-- Add helpful comment
COMMENT ON FUNCTION get_service_role_key() IS 'Retrieves the service role key from vault or database configuration for use in triggers';

-- Instructions for setting up the service role key:
--
-- Method 1: Using Supabase Vault (Recommended)
-- Insert secret using the vault.create_secret function (this should be done via Supabase dashboard or secure script):
-- SELECT vault.create_secret('your-actual-service-role-key-here', 'service_role_key');
--
-- Method 2: Using Database Configuration
-- Run this SQL in your Supabase SQL Editor (replace with actual key):
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'your-actual-service-role-key-here';
-- ALTER DATABASE postgres SET app.settings.supabase_url = 'https://qzzvcqoletuummdsbbio.supabase.co';
--
-- To verify configuration:
-- SELECT current_setting('app.settings.service_role_key', true);
-- SELECT current_setting('app.settings.supabase_url', true);
-- OR
-- SELECT get_service_role_key(); -- Should return the key if properly configured

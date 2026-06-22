-- Migration: Add Control Tower REST API Configuration Support
-- This migration extends the ai_configurations table to support REST API settings
-- for Control Tower integration, enabling migration from direct Supabase access
-- to the official Control Tower REST API.

-- Note: Configuration is stored in ai_configurations.configuration_data JSON field
-- where configuration_type = 'control_tower'
--
-- Example configuration_data structure after this migration:
-- {
--   "url": "https://...",              // Existing: Direct Supabase URL
--   "anon_key": "...",                  // Existing: Direct Supabase anon key
--   "is_active": true,                  // Existing: Whether config is active
--   "api_url": "https://ttlmdbgptqlvjswtcrnq.supabase.co/functions/v1",  // NEW: REST API base URL
--   "api_key_encrypted": "...",         // NEW: Encrypted API key for REST API
--   "api_version": "v1",                // NEW: API version (default: v1)
--   "use_rest_api": false               // NEW: Feature flag for gradual migration
-- }

-- Add comment to document the new fields
COMMENT ON TABLE ai_configurations IS
'Stores AI and integration configurations. For Control Tower (configuration_type = ''control_tower''),
the configuration_data JSON field now supports both legacy direct Supabase access and new REST API access:
- Legacy: url, anon_key, is_active
- REST API: api_url, api_key_encrypted, api_version, use_rest_api
Use use_rest_api flag to toggle between direct and API access.';

-- Create function to validate Control Tower REST API configuration
CREATE OR REPLACE FUNCTION validate_control_tower_rest_api_config(config_data jsonb)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- If use_rest_api is true, validate API fields
  IF (config_data->>'use_rest_api')::boolean = true THEN
    -- Check required API fields
    IF config_data->>'api_url' IS NULL OR config_data->>'api_url' = '' THEN
      RAISE EXCEPTION 'api_url is required when use_rest_api is enabled';
    END IF;

    IF config_data->>'api_key_encrypted' IS NULL OR config_data->>'api_key_encrypted' = '' THEN
      RAISE EXCEPTION 'api_key_encrypted is required when use_rest_api is enabled';
    END IF;
  END IF;

  RETURN true;
END;
$$;

-- Add check constraint to ensure valid REST API configuration
-- Note: We use a CHECK constraint with a function because configuration_data is JSONB
ALTER TABLE ai_configurations
DROP CONSTRAINT IF EXISTS check_control_tower_rest_api_config;

ALTER TABLE ai_configurations
ADD CONSTRAINT check_control_tower_rest_api_config
CHECK (
  configuration_type != 'control_tower' OR
  validate_control_tower_rest_api_config(configuration_data)
);

-- Create index for faster queries on Control Tower configurations
CREATE INDEX IF NOT EXISTS idx_ai_configurations_control_tower
ON ai_configurations(configuration_type)
WHERE configuration_type = 'control_tower';

-- Add helpful comment
COMMENT ON CONSTRAINT check_control_tower_rest_api_config ON ai_configurations IS
'Validates Control Tower REST API configuration when use_rest_api is enabled.
Ensures api_url and api_key_encrypted are present.';

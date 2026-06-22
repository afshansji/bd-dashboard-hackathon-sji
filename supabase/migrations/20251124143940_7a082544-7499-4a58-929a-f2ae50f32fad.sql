-- Add OAuth refresh token support to gohighlevel_integrations
ALTER TABLE gohighlevel_integrations
ADD COLUMN IF NOT EXISTS refresh_token_encrypted TEXT,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS token_type TEXT DEFAULT 'private_api_key';
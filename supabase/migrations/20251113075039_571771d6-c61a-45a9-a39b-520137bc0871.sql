-- Add notification_preferences column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}'::jsonb;

-- Add comment
COMMENT ON COLUMN profiles.notification_preferences IS 'User email notification preferences for various events';
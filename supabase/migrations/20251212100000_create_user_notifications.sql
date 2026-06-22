-- Create user_notifications table for in-app notifications
-- This migration creates a comprehensive notification system for user-facing notifications

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_notifications table
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- notification type: 'deal_assigned', 'deal_updated', 'mention', etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb, -- additional structured data
  link TEXT, -- optional link to navigate to
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON public.user_notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON public.user_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON public.user_notifications(type);

-- Enable Row Level Security
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.user_notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.user_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can update their own notifications (for marking as read)
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.user_notifications;
CREATE POLICY "Users can update their own notifications"
  ON public.user_notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own notifications
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.user_notifications;
CREATE POLICY "Users can delete their own notifications"
  ON public.user_notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Service role can insert notifications for any user
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.user_notifications;
CREATE POLICY "Service role can insert notifications"
  ON public.user_notifications
  FOR INSERT
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_user_notifications_updated_at ON public.user_notifications;
CREATE TRIGGER trigger_update_user_notifications_updated_at
  BEFORE UPDATE ON public.user_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_user_notifications_updated_at();

-- Create function to mark notification as read and set read_at timestamp
CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_notifications
  SET
    read = TRUE,
    read_at = NOW()
  WHERE
    id = notification_id
    AND user_id = auth.uid()
    AND read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark all notifications as read for current user
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read()
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_notifications
  SET
    read = TRUE,
    read_at = NOW()
  WHERE
    user_id = auth.uid()
    AND read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INTEGER AS $$
DECLARE
  count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO count
  FROM public.user_notifications
  WHERE
    user_id = auth.uid()
    AND read = FALSE;

  RETURN count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION mark_notification_as_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_as_read() TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notification_count() TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.user_notifications IS 'Stores in-app notifications for users';
COMMENT ON COLUMN public.user_notifications.type IS 'Type of notification (e.g., deal_assigned, deal_updated, mention)';
COMMENT ON COLUMN public.user_notifications.data IS 'Additional structured data in JSON format (deal_id, old_value, new_value, etc.)';
COMMENT ON COLUMN public.user_notifications.link IS 'Optional URL to navigate to when notification is clicked';
COMMENT ON FUNCTION mark_notification_as_read(UUID) IS 'Marks a specific notification as read for the current user';
COMMENT ON FUNCTION mark_all_notifications_as_read() IS 'Marks all notifications as read for the current user';
COMMENT ON FUNCTION get_unread_notification_count() IS 'Returns the count of unread notifications for the current user';

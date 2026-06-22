-- Create user_notifications table
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own notifications"
ON public.user_notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.user_notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.user_notifications FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
ON public.user_notifications FOR INSERT
WITH CHECK (true);

-- Updated at trigger
CREATE TRIGGER update_user_notifications_updated_at
BEFORE UPDATE ON public.user_notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Mark notification as read function
CREATE OR REPLACE FUNCTION public.mark_notification_as_read(notification_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.user_notifications
  SET read = true, read_at = now()
  WHERE id = notification_id AND user_id = auth.uid();
END;
$$;

-- Mark all notifications as read function
CREATE OR REPLACE FUNCTION public.mark_all_notifications_as_read()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.user_notifications
  SET read = true, read_at = now()
  WHERE user_id = auth.uid() AND read = false;
END;
$$;

-- Get unread notification count function
CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM public.user_notifications
  WHERE user_id = auth.uid() AND read = false;
$$;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
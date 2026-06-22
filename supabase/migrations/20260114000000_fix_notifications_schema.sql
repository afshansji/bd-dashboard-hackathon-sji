-- Fix user_notifications schema to add missing columns and relationships

-- Add missing columns to user_notifications table
ALTER TABLE public.user_notifications
ADD COLUMN IF NOT EXISTS task_id UUID,
ADD COLUMN IF NOT EXISTS comment_id UUID,
ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index on actor_id for relationship queries
CREATE INDEX IF NOT EXISTS idx_user_notifications_actor_id ON public.user_notifications(actor_id);

-- Rename 'link' column to 'link_url' if it exists and hasn't been renamed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'user_notifications' AND column_name = 'link'
  ) THEN
    ALTER TABLE public.user_notifications RENAME COLUMN link TO link_url;
  END IF;
END $$;

-- Ensure link_url column exists
ALTER TABLE public.user_notifications
ADD COLUMN IF NOT EXISTS link_url TEXT;

-- Update actor_id foreign key to reference profiles instead of auth.users
-- This allows client-side queries to join on the profiles table

-- First, drop the existing foreign key constraint
ALTER TABLE public.user_notifications
DROP CONSTRAINT IF EXISTS user_notifications_actor_id_fkey;

-- Add new foreign key referencing profiles table
ALTER TABLE public.user_notifications
ADD CONSTRAINT user_notifications_actor_id_fkey 
FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
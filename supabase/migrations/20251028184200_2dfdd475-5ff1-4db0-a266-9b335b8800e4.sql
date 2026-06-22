-- Add unique constraint to prevent multiple roles per user
-- First, clean up any existing duplicate roles by keeping only the first role created

-- Delete duplicate roles, keeping only the oldest role per user
DELETE FROM public.user_roles
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM public.user_roles
  ORDER BY user_id, created_at ASC
);

-- Add unique constraint on user_id to enforce single role per user
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);

-- Update the handle_new_user trigger function to check if role already exists
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only insert if user doesn't already have a role
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'team_member');
  END IF;
  RETURN NEW;
END;
$$;
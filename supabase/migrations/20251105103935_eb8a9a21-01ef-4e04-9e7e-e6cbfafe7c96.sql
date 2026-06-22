-- Backfill missing profiles for all existing auth users
INSERT INTO public.profiles (id, email, full_name)
SELECT 
  au.id,
  au.email,
  COALESCE(
    NULLIF(TRIM(CONCAT(
      COALESCE(au.raw_user_meta_data->>'first_name', ''),
      ' ',
      COALESCE(au.raw_user_meta_data->>'last_name', '')
    )), ''),
    split_part(au.email, '@', 1)
  )
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;

-- Assign default 'team_member' role to users missing any role
INSERT INTO public.user_roles (user_id, role)
SELECT 
  au.id,
  'team_member'::app_role
FROM auth.users au
LEFT JOIN public.user_roles ur ON ur.user_id = au.id
WHERE ur.user_id IS NULL;

-- Ensure new signups create both profile and default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile with best-effort full name
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(TRIM(CONCAT(
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        ' ',
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
      )), ''),
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Insert default role if not exists
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'team_member');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger only if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END$$;
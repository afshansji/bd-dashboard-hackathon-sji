-- 1) Relax NOT NULL on password_hash so we can mirror auth users without storing passwords here
ALTER TABLE public.users
  ALTER COLUMN password_hash DROP NOT NULL;

-- 2) Function to insert into public.users when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role, status, created_at, updated_at)
  VALUES (NEW.id, NEW.email, 'user'::app_role, 'active', now(), now())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3) Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_users ON auth.users;
CREATE TRIGGER on_auth_user_created_users
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_auth_user();

-- 4) Backfill existing auth users that don't have rows in public.users yet
INSERT INTO public.users (id, email, role, status, created_at, updated_at)
SELECT au.id, au.email, 'user'::app_role, 'active', now(), now()
FROM auth.users au
LEFT JOIN public.users u ON u.id = au.id
WHERE u.id IS NULL;

-- 5) Promote the requested user to super_admin
UPDATE public.users
SET role = 'super_admin'::app_role, updated_at = now()
WHERE lower(email::text) = 'sazzad.bashar@sjinnovation.com';
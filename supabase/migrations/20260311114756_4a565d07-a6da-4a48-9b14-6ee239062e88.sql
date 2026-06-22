-- Seed admin role for existing user (skip on fresh installs without this user)
INSERT INTO public.user_roles (user_id, role)
SELECT '02d94b42-cc2a-48f2-8b63-87edabba3545'::uuid, 'admin'::app_role
WHERE EXISTS (
  SELECT 1 FROM auth.users WHERE id = '02d94b42-cc2a-48f2-8b63-87edabba3545'::uuid
)
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
-- Promote specific user to super_admin role
UPDATE public.users
SET role = 'super_admin'::app_role, updated_at = now()
WHERE lower(email::text) = 'sazzad.bashar@sjinnovation.com';
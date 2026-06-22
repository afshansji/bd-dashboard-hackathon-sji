INSERT INTO public.user_roles (user_id, role)
VALUES ('02d94b42-cc2a-48f2-8b63-87edabba3545', 'admin'::app_role)
ON CONFLICT (user_id) DO UPDATE SET role = 'admin'::app_role;
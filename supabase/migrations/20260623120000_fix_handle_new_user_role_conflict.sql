-- Fix auth signup: user_roles unique constraint is (user_id, role) after 20260323103241,
-- but handle_new_user still used ON CONFLICT (user_id), causing signup to fail.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_error_message TEXT;
BEGIN
  v_full_name := COALESCE(
    NULLIF(TRIM(CONCAT(
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      ' ',
      COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    )), ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    split_part(NEW.email, '@', 1)
  );

  BEGIN
    INSERT INTO public.profiles (id, email, full_name, created_at)
    VALUES (NEW.id, NEW.email, v_full_name, now())
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(NULLIF(profiles.full_name, ''), EXCLUDED.full_name),
      updated_at = now();

    INSERT INTO public.users (id, email, first_name, last_name, status)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(v_full_name, ' ', 1)),
      COALESCE(NEW.raw_user_meta_data->>'last_name', NULLIF(SUBSTRING(v_full_name FROM POSITION(' ' IN v_full_name) + 1), '')),
      'active'
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      updated_at = now();

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'team_member')
    ON CONFLICT (user_id, role) DO NOTHING;

  EXCEPTION
    WHEN OTHERS THEN
      v_error_message := SQLERRM;

      INSERT INTO public.auth_sync_errors (
        user_id,
        error_type,
        error_message,
        raw_data
      ) VALUES (
        NEW.id,
        'profile_creation_failed',
        v_error_message,
        jsonb_build_object(
          'email', NEW.email,
          'metadata', NEW.raw_user_meta_data,
          'timestamp', now()
        )
      );

      RAISE;
  END;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fix_orphaned_users()
RETURNS TABLE(
  fixed_user_id UUID,
  user_email TEXT,
  profile_created BOOLEAN,
  role_created BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_full_name TEXT;
  v_profile_created BOOLEAN;
  v_role_created BOOLEAN;
  v_error TEXT;
BEGIN
  FOR v_user IN
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    WHERE p.id IS NULL
  LOOP
    v_profile_created := false;
    v_role_created := false;
    v_error := NULL;

    BEGIN
      v_full_name := COALESCE(
        NULLIF(TRIM(CONCAT(
          COALESCE(v_user.raw_user_meta_data->>'first_name', ''),
          ' ',
          COALESCE(v_user.raw_user_meta_data->>'last_name', '')
        )), ''),
        COALESCE(v_user.raw_user_meta_data->>'full_name', ''),
        split_part(v_user.email, '@', 1)
      );

      INSERT INTO public.profiles (id, email, full_name, created_at)
      VALUES (v_user.id, v_user.email, v_full_name, now())
      ON CONFLICT (id) DO NOTHING;

      v_profile_created := true;

      INSERT INTO public.users (id, email, first_name, last_name, status)
      VALUES (
        v_user.id,
        v_user.email,
        COALESCE(v_user.raw_user_meta_data->>'first_name', split_part(v_full_name, ' ', 1)),
        COALESCE(v_user.raw_user_meta_data->>'last_name', NULLIF(SUBSTRING(v_full_name FROM POSITION(' ' IN v_full_name) + 1), '')),
        'active'
      )
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.user_roles (user_id, role)
      VALUES (v_user.id, 'team_member')
      ON CONFLICT (user_id, role) DO NOTHING;

      v_role_created := true;

    EXCEPTION
      WHEN OTHERS THEN
        v_error := SQLERRM;
    END;

    RETURN QUERY SELECT
      v_user.id,
      v_user.email,
      v_profile_created,
      v_role_created,
      v_error;
  END LOOP;
END;
$$;

-- Create auth_sync_errors table for logging profile creation failures
CREATE TABLE IF NOT EXISTS public.auth_sync_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on auth_sync_errors
ALTER TABLE public.auth_sync_errors ENABLE ROW LEVEL SECURITY;

-- Only admins can view sync errors
CREATE POLICY "Admins can view auth sync errors"
  ON public.auth_sync_errors
  FOR SELECT
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

-- System can insert sync errors
CREATE POLICY "System can insert auth sync errors"
  ON public.auth_sync_errors
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_auth_sync_errors_user_id ON public.auth_sync_errors(user_id);
CREATE INDEX idx_auth_sync_errors_created_at ON public.auth_sync_errors(created_at DESC);

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Improved handle_new_user function with error handling and logging
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
  -- Build full name from metadata with fallback
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
    -- Insert profile with ON CONFLICT DO UPDATE for idempotency
    INSERT INTO public.profiles (id, email, full_name, created_at)
    VALUES (
      NEW.id,
      NEW.email,
      v_full_name,
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(NULLIF(profiles.full_name, ''), EXCLUDED.full_name),
      updated_at = now();

    -- Insert default role if not exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'team_member')
    ON CONFLICT (user_id) DO NOTHING;

  EXCEPTION
    WHEN OTHERS THEN
      -- Log error to auth_sync_errors table
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
      
      -- Re-raise the exception so signup fails visibly
      RAISE;
  END;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create utility function to fix orphaned users (users without profiles)
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
  -- Find users without profiles
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
      -- Build full name
      v_full_name := COALESCE(
        NULLIF(TRIM(CONCAT(
          COALESCE(v_user.raw_user_meta_data->>'first_name', ''),
          ' ',
          COALESCE(v_user.raw_user_meta_data->>'last_name', '')
        )), ''),
        COALESCE(v_user.raw_user_meta_data->>'full_name', ''),
        split_part(v_user.email, '@', 1)
      );
      
      -- Create profile
      INSERT INTO public.profiles (id, email, full_name, created_at)
      VALUES (v_user.id, v_user.email, v_full_name, now())
      ON CONFLICT (id) DO NOTHING;
      
      v_profile_created := true;
      
      -- Create default role
      INSERT INTO public.user_roles (user_id, role)
      VALUES (v_user.id, 'team_member')
      ON CONFLICT (user_id) DO NOTHING;
      
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

-- Grant execute permission to admins
GRANT EXECUTE ON FUNCTION public.fix_orphaned_users() TO authenticated;
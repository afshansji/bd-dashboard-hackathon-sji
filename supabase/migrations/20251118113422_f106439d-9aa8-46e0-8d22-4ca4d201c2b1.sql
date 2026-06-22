-- Drop obsolete security function
DROP FUNCTION IF EXISTS public.user_is_marketing_or_manager(_user_id uuid);

-- Drop is_marketing column from users table
ALTER TABLE public.users DROP COLUMN IF EXISTS is_marketing;
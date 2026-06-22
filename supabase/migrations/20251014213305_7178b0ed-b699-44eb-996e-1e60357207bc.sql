-- 1. Create users table with extended profile information
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  title TEXT,
  department TEXT,
  is_marketing BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create user_brands table for brand assignments
CREATE TABLE IF NOT EXISTS public.user_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  access_level TEXT DEFAULT 'member' CHECK (access_level IN ('owner', 'member', 'viewer')),
  can_view_analytics BOOLEAN DEFAULT TRUE,
  can_manage_content BOOLEAN DEFAULT TRUE,
  can_manage_team BOOLEAN DEFAULT FALSE,
  can_manage_settings BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, brand_id)
);

-- 3. Create user_permissions table for granular permissions
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  module_name TEXT NOT NULL,
  can_view BOOLEAN DEFAULT FALSE,
  can_create BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module_name)
);

-- 4. Add updated_at triggers
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_brands_updated_at
  BEFORE UPDATE ON public.user_brands
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_permissions_updated_at
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Enable RLS on new tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies for users table
CREATE POLICY "Users can view their own record"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert users"
  ON public.users FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update users"
  ON public.users FOR UPDATE
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete users"
  ON public.users FOR DELETE
  USING (public.has_role(auth.uid(), 'super_admin'));

-- 7. RLS policies for user_brands table
CREATE POLICY "Users can view their own brand assignments"
  ON public.user_brands FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all brand assignments"
  ON public.user_brands FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage brand assignments"
  ON public.user_brands FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- 8. RLS policies for user_permissions table
CREATE POLICY "Users can view their own permissions"
  ON public.user_permissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all permissions"
  ON public.user_permissions FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage permissions"
  ON public.user_permissions FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

-- 9. Migrate existing profile data to users table
INSERT INTO public.users (id, email, first_name, last_name, status, created_at, updated_at)
SELECT 
  p.id,
  p.email,
  SPLIT_PART(p.full_name, ' ', 1) as first_name,
  NULLIF(SUBSTRING(p.full_name FROM POSITION(' ' IN p.full_name) + 1), '') as last_name,
  'active' as status,
  p.created_at,
  p.updated_at
FROM public.profiles p
ON CONFLICT (id) DO NOTHING;

-- 10. Update trigger to sync new users to users table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Insert into users table with extended fields
  INSERT INTO public.users (
    id, 
    email, 
    first_name, 
    last_name, 
    title, 
    department, 
    is_marketing,
    status
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.raw_user_meta_data->>'title',
    NEW.raw_user_meta_data->>'department',
    COALESCE((NEW.raw_user_meta_data->>'is_marketing')::BOOLEAN, FALSE),
    'active'
  );
  
  -- Assign default role as team_member
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'team_member')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;
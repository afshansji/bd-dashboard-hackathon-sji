-- Create security definer function to get current user role without triggering RLS
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role::text FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Managers can view manager level and below" ON public.users;
DROP POLICY IF EXISTS "Only super admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Super admins can update any user" ON public.users;
DROP POLICY IF EXISTS "Super admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

-- Create new policies using the security definer function (non-recursive)
CREATE POLICY "Users can view their own profile" ON public.users
FOR SELECT USING ((auth.uid())::text = (id)::text);

CREATE POLICY "Users can update their own profile" ON public.users
FOR UPDATE USING ((auth.uid())::text = (id)::text);

CREATE POLICY "Super admins can view all users" ON public.users
FOR SELECT USING (public.get_current_user_role() = 'super_admin');

CREATE POLICY "Super admins can update any user" ON public.users
FOR UPDATE USING (public.get_current_user_role() = 'super_admin');

CREATE POLICY "Super admins can insert users" ON public.users
FOR INSERT WITH CHECK (public.get_current_user_role() = 'super_admin');

CREATE POLICY "Managers can view manager level and below" ON public.users
FOR SELECT USING (
  public.get_current_user_role() IN ('super_admin', 'manager') AND
  role IN ('manager', 'pm', 'user')
);
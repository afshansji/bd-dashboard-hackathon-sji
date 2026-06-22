
-- Step 1: Allow multiple roles per user
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_unique;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_unique UNIQUE (user_id, role);

-- Step 2: Create pod_members table
CREATE TABLE IF NOT EXISTS public.pod_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pod_id UUID NOT NULL REFERENCES public.pods(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pod_id, user_id)
);

-- Enable RLS
ALTER TABLE public.pod_members ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view pod members"
  ON public.pod_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage pod members"
  ON public.pod_members FOR ALL
  USING (public.is_manager_or_admin());

-- Indexes
CREATE INDEX idx_pod_members_pod_id ON public.pod_members(pod_id);
CREATE INDEX idx_pod_members_user_id ON public.pod_members(user_id);

-- Updated_at trigger
CREATE TRIGGER update_pod_members_updated_at
  BEFORE UPDATE ON public.pod_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

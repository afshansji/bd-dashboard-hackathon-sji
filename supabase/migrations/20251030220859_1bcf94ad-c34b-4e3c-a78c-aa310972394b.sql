-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view own configurations" ON public.ai_configurations;

-- Allow all authenticated users to read feature flags (global settings)
CREATE POLICY "Anyone can view feature flags"
ON public.ai_configurations FOR SELECT
TO authenticated
USING (configuration_type = 'feature_flags');

-- Restrict other configuration types to owners and admins
CREATE POLICY "Admins can view all non-flag configurations"
ON public.ai_configurations FOR SELECT
TO authenticated
USING (
  configuration_type != 'feature_flags' AND
  ((auth.uid() = user_id) OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'))
);
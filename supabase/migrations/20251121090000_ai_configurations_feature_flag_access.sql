-- Grant broad read access to feature flag configurations
-- Allows any authenticated session to read feature flag rows while preserving
-- existing role- and owner-based checks for other configuration types.

-- Replace the previous restrictive SELECT policy with one that separates
-- feature flag access from the role-based checks introduced earlier.
DROP POLICY IF EXISTS "Users can view own configurations" ON public.ai_configurations;

CREATE POLICY "ai_configurations_view_feature_flags"
  ON public.ai_configurations
  FOR SELECT
  TO authenticated
  USING (configuration_type = 'feature_flags');

CREATE POLICY "Users can view own configurations"
  ON public.ai_configurations
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

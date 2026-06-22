-- AI Agent Framework Enhancements
-- Adds governance indexes, triggers, supporting tables, and refined RLS policies

-- Ensure uuid-ossp extension is available for triggers relying on timestamps
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add governance indexes
CREATE INDEX IF NOT EXISTS ai_agents_category_idx ON public.ai_agents (category);
CREATE INDEX IF NOT EXISTS ai_agents_created_at_idx ON public.ai_agents (created_at DESC);
CREATE INDEX IF NOT EXISTS ai_agent_runs_executed_by_idx ON public.ai_agent_runs (executed_by);
CREATE INDEX IF NOT EXISTS ai_agent_runs_created_at_idx ON public.ai_agent_runs (created_at DESC);

-- Additional metadata columns
ALTER TABLE public.ai_agents
  ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.ai_agent_runs
  ADD COLUMN IF NOT EXISTS output JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS provider_chain JSONB DEFAULT '[]'::jsonb;

-- Shared resources to support vector stores and shared assets
CREATE TABLE IF NOT EXISTS public.ai_shared_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  resource_identifier TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

CREATE INDEX IF NOT EXISTS ai_shared_resources_agent_idx ON public.ai_shared_resources(agent_id);
CREATE INDEX IF NOT EXISTS ai_shared_resources_resource_type_idx ON public.ai_shared_resources(resource_type);

-- Updated at trigger helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach triggers to maintain timestamps
DROP TRIGGER IF EXISTS ai_agents_touch_updated_at ON public.ai_agents;
CREATE TRIGGER ai_agents_touch_updated_at
  BEFORE UPDATE ON public.ai_agents
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS ai_configurations_touch_updated_at ON public.ai_configurations;
CREATE TRIGGER ai_configurations_touch_updated_at
  BEFORE UPDATE ON public.ai_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS ai_shared_resources_touch_updated_at ON public.ai_shared_resources;
CREATE TRIGGER ai_shared_resources_touch_updated_at
  BEFORE UPDATE ON public.ai_shared_resources
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

-- Expand role-based access policies
DROP POLICY IF EXISTS "ai_agents_user_access" ON public.ai_agents;
CREATE POLICY "ai_agents_admin_write"
  ON public.ai_agents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE id::text = auth.uid()::text
        AND role = ANY(ARRAY['super_admin'::app_role, 'manager'::app_role])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE id::text = auth.uid()::text
        AND role = ANY(ARRAY['super_admin'::app_role, 'manager'::app_role])
    )
  );

CREATE POLICY "ai_agents_view"
  ON public.ai_agents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE id::text = auth.uid()::text
        AND role = ANY(ARRAY['super_admin'::app_role, 'manager'::app_role, 'pm'::app_role])
    )
  );

DROP POLICY IF EXISTS "ai_configurations_user_access" ON public.ai_configurations;
CREATE POLICY "ai_configurations_admin_write"
  ON public.ai_configurations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE id::text = auth.uid()::text
        AND role = ANY(ARRAY['super_admin'::app_role, 'manager'::app_role])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE id::text = auth.uid()::text
        AND role = ANY(ARRAY['super_admin'::app_role, 'manager'::app_role])
    )
  );

CREATE POLICY "ai_configurations_view"
  ON public.ai_configurations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE id::text = auth.uid()::text
        AND role = ANY(ARRAY['super_admin'::app_role, 'manager'::app_role, 'pm'::app_role])
    )
  );

DROP POLICY IF EXISTS "ai_agent_runs_user_access" ON public.ai_agent_runs;
CREATE POLICY "ai_agent_runs_admin_write"
  ON public.ai_agent_runs
  FOR ALL
  TO authenticated
  USING (
    executed_by::text = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.users
      WHERE id::text = auth.uid()::text
        AND role = ANY(ARRAY['super_admin'::app_role, 'manager'::app_role])
    )
  )
  WITH CHECK (
    executed_by::text = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.users
      WHERE id::text = auth.uid()::text
        AND role = ANY(ARRAY['super_admin'::app_role, 'manager'::app_role])
    )
  );

CREATE POLICY "ai_agent_runs_view"
  ON public.ai_agent_runs
  FOR SELECT
  TO authenticated
  USING (
    executed_by::text = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.users
      WHERE id::text = auth.uid()::text
        AND role = ANY(ARRAY['super_admin'::app_role, 'manager'::app_role, 'pm'::app_role])
    )
  );

ALTER TABLE public.ai_shared_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_shared_resources_admin_write"
  ON public.ai_shared_resources
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE id::text = auth.uid()::text
        AND role = ANY(ARRAY['super_admin'::app_role, 'manager'::app_role])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE id::text = auth.uid()::text
        AND role = ANY(ARRAY['super_admin'::app_role, 'manager'::app_role])
    )
  );

CREATE POLICY "ai_shared_resources_view"
  ON public.ai_shared_resources
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE id::text = auth.uid()::text
        AND role = ANY(ARRAY['super_admin'::app_role, 'manager'::app_role, 'pm'::app_role])
    )
  );

-- Seed placeholder shared resources for documentation
INSERT INTO public.ai_shared_resources (agent_id, resource_type, resource_identifier, metadata)
SELECT id, 'vector_store', 'demo-store-' || slug, jsonb_build_object('description', 'Seeded vector store mapping for ' || name)
FROM public.ai_agents
ON CONFLICT DO NOTHING;

-- Align agent config JSON schema with provider routing defaults
UPDATE public.ai_agents
SET config = jsonb_strip_nulls(
  jsonb_build_object(
    'providers', jsonb_build_object(
      'primary', jsonb_build_object('provider', 'openai', 'model', 'gpt-4o-mini'),
      'fallback', jsonb_build_object('provider', 'openai', 'model', 'gpt-4o-mini'),
      'research', jsonb_build_object('provider', 'perplexity', 'model', 'sonar-small')
    ),
    'features', jsonb_build_object('enableResearch', false, 'enableTelemetry', true)
  )
)
WHERE config = '{}'::jsonb;


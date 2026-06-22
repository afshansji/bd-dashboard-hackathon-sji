-- Phase 1: Create collabai_integrations table
CREATE TABLE IF NOT EXISTS public.collabai_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  base_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  agent_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create unique partial index for active integrations
CREATE UNIQUE INDEX IF NOT EXISTS idx_collabai_integrations_user_active 
  ON public.collabai_integrations(user_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_collabai_integrations_user 
  ON public.collabai_integrations(user_id);

-- Phase 2: Create collabai_agents table
CREATE TABLE IF NOT EXISTS public.collabai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.collabai_integrations(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  agent_type TEXT DEFAULT 'General',
  is_active BOOLEAN DEFAULT true,
  sample_questions JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(integration_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_collabai_agents_integration 
  ON public.collabai_agents(integration_id);

CREATE INDEX IF NOT EXISTS idx_collabai_agents_active 
  ON public.collabai_agents(integration_id, is_active);

-- Phase 3: Create ai_configurations table
CREATE TABLE IF NOT EXISTS public.ai_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  configuration_type TEXT NOT NULL,
  configuration_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, configuration_type)
);

CREATE INDEX IF NOT EXISTS idx_ai_configurations_user_type 
  ON public.ai_configurations(user_id, configuration_type);

-- Phase 4: Create user_accountability_chart table (fresh, not renaming)
CREATE TABLE IF NOT EXISTS public.user_accountability_chart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  serial_number INTEGER NOT NULL DEFAULT 0,
  type_of_work TEXT NOT NULL,
  responsibilities TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_accountability_chart_user 
  ON public.user_accountability_chart(user_id);

-- Phase 5: Update ai_agent_runs table
ALTER TABLE public.ai_agent_runs 
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS ai_summary JSONB,
  ADD COLUMN IF NOT EXISTS generated_tasks JSONB,
  ADD COLUMN IF NOT EXISTS category TEXT;

-- Phase 6: Enable RLS on all new tables
ALTER TABLE public.collabai_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collabai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_accountability_chart ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collabai_integrations
DROP POLICY IF EXISTS "Users can view own integrations" ON public.collabai_integrations;
CREATE POLICY "Users can view own integrations" 
  ON public.collabai_integrations FOR SELECT 
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can create own integrations" ON public.collabai_integrations;
CREATE POLICY "Users can create own integrations" 
  ON public.collabai_integrations FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own integrations" ON public.collabai_integrations;
CREATE POLICY "Users can update own integrations" 
  ON public.collabai_integrations FOR UPDATE 
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete integrations" ON public.collabai_integrations;
CREATE POLICY "Admins can delete integrations" 
  ON public.collabai_integrations FOR DELETE 
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for collabai_agents
DROP POLICY IF EXISTS "Users can view agents from own integrations" ON public.collabai_agents;
CREATE POLICY "Users can view agents from own integrations" 
  ON public.collabai_agents FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.collabai_integrations ci 
      WHERE ci.id = collabai_agents.integration_id 
      AND (ci.user_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

DROP POLICY IF EXISTS "Admins can manage agents" ON public.collabai_agents;
CREATE POLICY "Admins can manage agents" 
  ON public.collabai_agents FOR ALL 
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for ai_configurations
DROP POLICY IF EXISTS "Users can view own configurations" ON public.ai_configurations;
CREATE POLICY "Users can view own configurations" 
  ON public.ai_configurations FOR SELECT 
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can create own configurations" ON public.ai_configurations;
CREATE POLICY "Users can create own configurations" 
  ON public.ai_configurations FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own configurations" ON public.ai_configurations;
CREATE POLICY "Users can update own configurations" 
  ON public.ai_configurations FOR UPDATE 
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can delete own configurations" ON public.ai_configurations;
CREATE POLICY "Users can delete own configurations" 
  ON public.ai_configurations FOR DELETE 
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for user_accountability_chart
DROP POLICY IF EXISTS "Admins can manage accountability chart" ON public.user_accountability_chart;
CREATE POLICY "Admins can manage accountability chart" 
  ON public.user_accountability_chart FOR ALL 
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can view all accountability chart" ON public.user_accountability_chart;
CREATE POLICY "Users can view all accountability chart" 
  ON public.user_accountability_chart FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Add updated_at triggers for new tables
CREATE TRIGGER update_collabai_integrations_updated_at 
  BEFORE UPDATE ON public.collabai_integrations 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_collabai_agents_updated_at 
  BEFORE UPDATE ON public.collabai_agents 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_configurations_updated_at 
  BEFORE UPDATE ON public.ai_configurations 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_accountability_chart_updated_at 
  BEFORE UPDATE ON public.user_accountability_chart 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
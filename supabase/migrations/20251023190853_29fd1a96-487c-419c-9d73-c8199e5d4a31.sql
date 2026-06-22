-- Phase 1: AI Agents Management - Database Schema Migration

-- 1.1 Extend ai_agents table with new columns
ALTER TABLE ai_agents 
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS slug TEXT,
ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS system_prompt TEXT,
ADD COLUMN IF NOT EXISTS output_actions JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS schedule_config JSONB DEFAULT '{"schedule": "manual", "priority": "medium"}'::jsonb,
ADD COLUMN IF NOT EXISTS data_source_config JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS success_rate NUMERIC DEFAULT 0;

-- Migrate existing data
UPDATE ai_agents SET category = type WHERE category IS NULL;
UPDATE ai_agents SET slug = LOWER(REPLACE(name, ' ', '-')) WHERE slug IS NULL;
UPDATE ai_agents SET is_enabled = is_active WHERE is_enabled IS NULL;
UPDATE ai_agents SET system_prompt = prompt_template WHERE system_prompt IS NULL AND prompt_template IS NOT NULL;

-- Create unique constraint on slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_agents_slug ON ai_agents(slug);

-- 1.2 Create ai_agent_templates table
CREATE TABLE IF NOT EXISTS ai_agent_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  provider TEXT NOT NULL,
  model TEXT,
  template_config JSONB NOT NULL,
  is_public BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE ai_agent_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for templates
CREATE POLICY "Public templates visible to all authenticated users"
  ON ai_agent_templates FOR SELECT
  USING (is_public = true AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage their own templates"
  ON ai_agent_templates FOR ALL
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_ai_agent_templates_updated_at
  BEFORE UPDATE ON ai_agent_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default templates
INSERT INTO ai_agent_templates (name, description, category, provider, model, template_config) VALUES
('Project Report Analyzer', 'Analyzes ActiveCollab task data to generate executive summaries', 'project_intelligence', 'openai', 'gpt-4o-mini', 
 '{"system_prompt": "You are a Client Success Manager preparing professional project status updates. Analyze task data and create concise executive summaries highlighting progress, blockers, and next steps.", "data_sources": ["projects", "tasks"], "output_actions": {"create_tasks": true, "send_alerts": false}}'::jsonb),
('Revenue Forecast Agent', 'Predicts revenue trends and identifies forecast risks', 'revenue_forecasting', 'openai', 'gpt-4o', 
 '{"system_prompt": "You are a financial analyst specializing in revenue forecasting. Analyze deal pipeline data, identify trends, and provide actionable recommendations for revenue optimization.", "data_sources": ["deals", "clients"], "output_actions": {"send_alerts": true, "create_tasks": false}}'::jsonb),
('Deal Status Intelligence', 'Analyzes deal data to provide insights and recommendations', 'business_development', 'openai', 'gpt-4o-mini',
 '{"system_prompt": "You are a business development analyst. Analyze deal status, identify risks, and provide actionable recommendations to move deals forward.", "data_sources": ["deals", "clients", "contacts"], "output_actions": {"create_tasks": true, "send_alerts": true}}'::jsonb);

-- 1.3 Create ai_business_context table
CREATE TABLE IF NOT EXISTS ai_business_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  data JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE ai_business_context ENABLE ROW LEVEL SECURITY;

-- RLS Policies for business context
CREATE POLICY "Business context visible to authenticated users"
  ON ai_business_context FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage business context"
  ON ai_business_context FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_ai_business_context_updated_at
  BEFORE UPDATE ON ai_business_context
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 1.4 Update ai_agent_runs for success tracking
ALTER TABLE ai_agent_runs 
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Ensure status column has correct default
ALTER TABLE ai_agent_runs ALTER COLUMN status SET DEFAULT 'completed';

-- Create trigger to update agent success rate after each run
CREATE OR REPLACE FUNCTION update_agent_success_rate()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_agents
  SET 
    success_rate = (
      SELECT COALESCE(
        (COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / NULLIF(COUNT(*), 0)),
        0
      )
      FROM ai_agent_runs
      WHERE agent_id = NEW.agent_id
    ),
    last_run_at = NEW.created_at
  WHERE id = NEW.agent_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER after_agent_run_insert
  AFTER INSERT ON ai_agent_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_success_rate();
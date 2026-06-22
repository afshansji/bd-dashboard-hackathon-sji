-- Create AI Agents Management Tables
CREATE TABLE IF NOT EXISTS public.ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  data_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_enabled BOOLEAN DEFAULT true,
  required_role app_role DEFAULT 'manager',
  schedule_config JSONB DEFAULT '{}'::jsonb,
  output_actions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

CREATE TABLE IF NOT EXISTS public.ai_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  configuration_type TEXT NOT NULL,
  configuration_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

CREATE TABLE IF NOT EXISTS public.ai_agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id),
  executed_by UUID,
  execution_context JSONB DEFAULT '{}'::jsonb,
  ai_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_tasks JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'completed',
  approval_status TEXT DEFAULT 'pending',
  tags JSONB DEFAULT '[]'::jsonb,
  category TEXT,
  title TEXT,
  business_context TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by UUID
);

-- Enable Row Level Security
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_runs ENABLE ROW LEVEL SECURITY;

-- AI Agents policies
CREATE POLICY "ai_agents_user_access"
ON public.ai_agents
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role = ANY(ARRAY['super_admin'::app_role, 'manager'::app_role])
));

-- AI Configurations policies  
CREATE POLICY "ai_configurations_user_access"
ON public.ai_configurations
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role = ANY(ARRAY['super_admin'::app_role, 'manager'::app_role])
));

-- AI Agent Runs policies
CREATE POLICY "ai_agent_runs_user_access"
ON public.ai_agent_runs
FOR ALL
TO authenticated
USING (executed_by::text = auth.uid()::text OR EXISTS (
  SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role = ANY(ARRAY['super_admin'::app_role, 'manager'::app_role])
));

-- Insert initial AI agent configurations
INSERT INTO public.ai_agents (name, slug, description, category, system_prompt, data_sources) VALUES
('Expense Analysis', 'expense-analysis', 'AI-powered expense analysis and optimization', 'expense', 'You are a financial analyst specializing in expense optimization. Analyze expense data and provide actionable insights.', '["expenses", "invoices"]'),
('Income Forecasting', 'income-forecasting', 'Intelligent income prediction and trend analysis', 'income', 'You are a financial forecasting expert. Analyze income patterns and predict future revenue streams.', '["invoices", "payments"]'),
('Cash Flow Analysis', 'cash-flow-analysis', 'Comprehensive cash flow analysis and forecasting', 'cash_flow', 'You are a cash flow specialist. Analyze financial data to provide cash flow insights and recommendations.', '["expenses", "invoices", "payments"]');

-- Insert initial configurations
INSERT INTO public.ai_configurations (configuration_type, configuration_data) VALUES
('business_context', '{
  "company_name": "Your Company",
  "industry": "Technology",
  "company_size": "Medium",
  "seasonal_rules": {
    "Q1": "Focus on cost optimization after holiday spending",
    "Q2": "Prepare for summer expansion",
    "Q3": "Monitor seasonal variations",
    "Q4": "Plan for holiday season and year-end"
  },
  "office_rules": {},
  "company_policies": "Follow standard financial policies and procedures"
}'::jsonb),
('model_settings', '{
  "default_model": "gpt-4o-mini",
  "temperature": 0.7,
  "max_tokens": 2000,
  "max_completion_tokens": 2000
}'::jsonb),
('prompts', '{
  "system_prompt": "You are an AI financial analyst assistant.",
  "analysis_prompts": {
    "categorization": "Categorize and analyze the following financial data",
    "anomaly_detection": "Identify any anomalies or unusual patterns",
    "vendor_analysis": "Analyze vendor spending patterns"
  },
  "financial_prompts": {
    "financial_insights": "Provide key financial insights",
    "trend_analysis": "Analyze trends and patterns",
    "forecasting": "Generate financial forecasts",
    "natural_language_query": "Answer financial questions in natural language"
  }
}'::jsonb);
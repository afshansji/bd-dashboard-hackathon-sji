-- ============================================
-- Phase 1: Automated Multi-Channel Outreach Orchestration Engine
-- Database Schema Implementation
-- ============================================

-- Table 1: campaign_sequences (Master sequence definitions)
CREATE TABLE IF NOT EXISTS public.campaign_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.bd_campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  trigger_condition JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 2: sequence_steps (Individual steps in a sequence)
CREATE TABLE IF NOT EXISTS public.sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES public.campaign_sequences(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('linkedin_connection', 'linkedin_message', 'email', 'phone_call', 'manual_task')),
  delay_value INTEGER NOT NULL DEFAULT 1,
  delay_unit TEXT NOT NULL DEFAULT 'days' CHECK (delay_unit IN ('minutes', 'hours', 'days')),
  content_template JSONB NOT NULL DEFAULT '{}'::jsonb,
  conditions JSONB DEFAULT '{}'::jsonb,
  fallback_step_id UUID REFERENCES public.sequence_steps(id),
  ai_personalization_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sequence_id, step_order)
);

-- Table 3: contact_sequence_enrollments (Track contacts in sequences)
CREATE TABLE IF NOT EXISTS public.contact_sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.campaign_contacts(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES public.campaign_sequences(id) ON DELETE CASCADE,
  current_step_id UUID REFERENCES public.sequence_steps(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'failed', 'exited')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_step_executed_at TIMESTAMPTZ,
  next_step_scheduled_at TIMESTAMPTZ,
  exit_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contact_id, sequence_id)
);

-- Table 4: sequence_execution_log (Audit trail)
CREATE TABLE IF NOT EXISTS public.sequence_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.contact_sequence_enrollments(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.sequence_steps(id),
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  channel_used TEXT,
  message_sent TEXT,
  response_received BOOLEAN DEFAULT false,
  response_data JSONB,
  error_message TEXT,
  execution_metadata JSONB DEFAULT '{}'::jsonb
);

-- Table 5: sequence_rules (Cross-campaign intelligence)
CREATE TABLE IF NOT EXISTS public.sequence_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type TEXT NOT NULL CHECK (rule_type IN ('contact_cooldown', 'duplicate_prevention', 'response_detection', 'rate_limit')),
  rule_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 6: sequence_rate_limits (API rate limiting configuration)
CREATE TABLE IF NOT EXISTS public.sequence_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL UNIQUE CHECK (channel IN ('linkedin_connection', 'linkedin_message', 'email', 'phone_call')),
  max_per_minute INTEGER NOT NULL DEFAULT 10,
  max_per_hour INTEGER NOT NULL DEFAULT 100,
  max_per_day INTEGER NOT NULL DEFAULT 500,
  cooldown_minutes INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Performance Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_campaign_sequences_campaign_id ON public.campaign_sequences(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sequences_status ON public.campaign_sequences(status);

CREATE INDEX IF NOT EXISTS idx_sequence_steps_sequence_id ON public.sequence_steps(sequence_id);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_order ON public.sequence_steps(sequence_id, step_order);

CREATE INDEX IF NOT EXISTS idx_enrollments_contact_id ON public.contact_sequence_enrollments(contact_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_sequence_id ON public.contact_sequence_enrollments(sequence_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON public.contact_sequence_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_next_scheduled ON public.contact_sequence_enrollments(next_step_scheduled_at) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_execution_log_enrollment_id ON public.sequence_execution_log(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_execution_log_executed_at ON public.sequence_execution_log(executed_at DESC);

-- ============================================
-- RLS Policies
-- ============================================

-- Enable RLS
ALTER TABLE public.campaign_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequence_execution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequence_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequence_rate_limits ENABLE ROW LEVEL SECURITY;

-- campaign_sequences policies
CREATE POLICY "Authenticated users can view sequences" ON public.campaign_sequences
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Campaign owners can manage sequences" ON public.campaign_sequences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.bd_campaigns c
      WHERE c.id = campaign_sequences.campaign_id
      AND (c.created_by = auth.uid() OR c.owned_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- sequence_steps policies
CREATE POLICY "Authenticated users can view steps" ON public.sequence_steps
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Sequence owners can manage steps" ON public.sequence_steps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.campaign_sequences cs
      JOIN public.bd_campaigns c ON c.id = cs.campaign_id
      WHERE cs.id = sequence_steps.sequence_id
      AND (c.created_by = auth.uid() OR c.owned_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- contact_sequence_enrollments policies
CREATE POLICY "Authenticated users can view enrollments" ON public.contact_sequence_enrollments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Campaign owners can manage enrollments" ON public.contact_sequence_enrollments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.campaign_contacts cc
      JOIN public.bd_campaigns c ON c.id = cc.campaign_id
      WHERE cc.id = contact_sequence_enrollments.contact_id
      AND (c.created_by = auth.uid() OR c.owned_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- sequence_execution_log policies
CREATE POLICY "Authenticated users can view execution logs" ON public.sequence_execution_log
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert execution logs" ON public.sequence_execution_log
  FOR INSERT WITH CHECK (true);

-- sequence_rules policies
CREATE POLICY "Authenticated users can view rules" ON public.sequence_rules
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage rules" ON public.sequence_rules
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- sequence_rate_limits policies
CREATE POLICY "Authenticated users can view rate limits" ON public.sequence_rate_limits
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage rate limits" ON public.sequence_rate_limits
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- ============================================
-- Triggers
-- ============================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_sequence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campaign_sequences_updated_at
  BEFORE UPDATE ON public.campaign_sequences
  FOR EACH ROW EXECUTE FUNCTION update_sequence_updated_at();

CREATE TRIGGER update_sequence_steps_updated_at
  BEFORE UPDATE ON public.sequence_steps
  FOR EACH ROW EXECUTE FUNCTION update_sequence_updated_at();

CREATE TRIGGER update_enrollments_updated_at
  BEFORE UPDATE ON public.contact_sequence_enrollments
  FOR EACH ROW EXECUTE FUNCTION update_sequence_updated_at();

CREATE TRIGGER update_sequence_rules_updated_at
  BEFORE UPDATE ON public.sequence_rules
  FOR EACH ROW EXECUTE FUNCTION update_sequence_updated_at();

-- ============================================
-- Insert Default Rate Limits
-- ============================================

INSERT INTO public.sequence_rate_limits (channel, max_per_minute, max_per_hour, max_per_day, cooldown_minutes)
VALUES 
  ('linkedin_connection', 5, 50, 200, 10),
  ('linkedin_message', 10, 100, 300, 5),
  ('email', 20, 200, 1000, 2),
  ('phone_call', 5, 30, 100, 15)
ON CONFLICT (channel) DO NOTHING;

-- ============================================
-- Insert Default Rules
-- ============================================

INSERT INTO public.sequence_rules (rule_type, rule_config, priority, is_active)
VALUES 
  ('contact_cooldown', '{"cooldown_days": 30, "description": "Wait 30 days before re-contacting the same person across campaigns"}'::jsonb, 1, true),
  ('duplicate_prevention', '{"check_active_enrollments": true, "description": "Prevent enrolling contacts already in active sequences"}'::jsonb, 2, true),
  ('response_detection', '{"auto_pause_on_response": true, "description": "Automatically pause sequences when contact responds"}'::jsonb, 3, true)
ON CONFLICT DO NOTHING;
-- Phase 1: Email Templates Table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  category TEXT CHECK (category IN ('outreach', 'follow_up', 'meeting', 'thank_you', 'custom')) DEFAULT 'custom',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on email_templates
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_templates
CREATE POLICY "Users can view active email templates"
  ON public.email_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can create their own email templates"
  ON public.email_templates FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own email templates"
  ON public.email_templates FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own email templates"
  ON public.email_templates FOR DELETE
  USING (auth.uid() = created_by);

-- Seed with existing hardcoded templates
INSERT INTO public.email_templates (name, subject, body, variables, category, is_active) VALUES
('Initial Outreach', 'Exploring Potential Partnership', 
'Hi {Contact Name},

I hope this message finds you well. I came across your profile and was impressed by your work at {Company}.

I''d love to discuss potential opportunities for collaboration. Would you be open to a brief conversation?

Best regards,
{User Name}',
'["Contact Name", "Company", "User Name"]'::jsonb, 'outreach', true),

('Follow-up', 'Following Up on My Previous Message',
'Hi {Contact Name},

I wanted to follow up on my previous message regarding potential collaboration opportunities.

I understand you''re busy, but I believe there could be mutual benefits to exploring this further.

Would you be available for a quick call this week?

Best regards,
{User Name}',
'["Contact Name", "User Name"]'::jsonb, 'follow_up', true),

('Meeting Request', 'Meeting Request - {Campaign Name}',
'Hi {Contact Name},

Thank you for your response. I''d like to schedule a brief meeting to discuss how we can work together.

Are you available next week? I''m flexible with timing and happy to work around your schedule.

Looking forward to connecting,
{User Name}',
'["Contact Name", "Campaign Name", "User Name"]'::jsonb, 'meeting', true),

('Thank You', 'Thank You for Your Time',
'Hi {Contact Name},

Thank you for taking the time to meet with me. I really appreciated our conversation and learning more about {Company}.

I''ll follow up with the information we discussed. Please don''t hesitate to reach out if you have any questions.

Best regards,
{User Name}',
'["Contact Name", "Company", "User Name"]'::jsonb, 'thank_you', true);

-- Phase 2: Enhance contact_sequence_enrollments table
ALTER TABLE public.contact_sequence_enrollments
  ADD COLUMN IF NOT EXISTS scheduling_mode TEXT CHECK (scheduling_mode IN ('immediate', 'scheduled', 'drip')) DEFAULT 'drip',
  ADD COLUMN IF NOT EXISTS batch_config JSONB DEFAULT '{"messagesPerBatch": 25, "interval": 1, "intervalUnit": "days"}'::jsonb,
  ADD COLUMN IF NOT EXISTS send_days TEXT[] DEFAULT ARRAY['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  ADD COLUMN IF NOT EXISTS time_window_start TIME,
  ADD COLUMN IF NOT EXISTS time_window_end TIME,
  ADD COLUMN IF NOT EXISTS start_date_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_batch_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_sent INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_to_send INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL;

-- Phase 3: Sequence Batch Queue Table
CREATE TABLE IF NOT EXISTS public.sequence_batch_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.contact_sequence_enrollments(id) ON DELETE CASCADE,
  batch_number INTEGER NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')) DEFAULT 'pending',
  contacts_in_batch UUID[] DEFAULT ARRAY[]::UUID[],
  emails_sent INTEGER DEFAULT 0,
  emails_failed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on sequence_batch_queue
ALTER TABLE public.sequence_batch_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sequence_batch_queue
CREATE POLICY "Users can view their own batch queue"
  ON public.sequence_batch_queue FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contact_sequence_enrollments cse
      JOIN public.campaign_sequences cs ON cs.id = cse.sequence_id
      JOIN public.bd_campaigns bc ON bc.id = cs.campaign_id
      WHERE cse.id = sequence_batch_queue.enrollment_id
      AND (bc.owned_by = auth.uid() OR bc.created_by = auth.uid())
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_batch_queue_scheduled ON public.sequence_batch_queue(scheduled_for, status);
CREATE INDEX IF NOT EXISTS idx_batch_queue_enrollment ON public.sequence_batch_queue(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_sequence_status ON public.contact_sequence_enrollments(sequence_id, status);
CREATE INDEX IF NOT EXISTS idx_enrollments_next_batch ON public.contact_sequence_enrollments(next_batch_at) WHERE status = 'active';

-- Trigger to update updated_at on email_templates
CREATE OR REPLACE FUNCTION public.update_email_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_email_template_updated_at();

-- Trigger to update updated_at on sequence_batch_queue
CREATE TRIGGER update_batch_queue_updated_at
  BEFORE UPDATE ON public.sequence_batch_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
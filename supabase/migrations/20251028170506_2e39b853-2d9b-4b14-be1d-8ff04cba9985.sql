-- Create table for LinkedIn message generation history
CREATE TABLE campaign_contact_linkedin_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES campaign_contacts(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES bd_campaigns(id) ON DELETE CASCADE,
  
  -- Message metadata
  message_type TEXT NOT NULL CHECK (message_type IN ('connection_request', 'first_followup', 'second_followup', 'meeting_request')),
  user_context TEXT,
  
  -- Generated variants (JSONB to store all 3 variants)
  message_variants JSONB NOT NULL,
  recommended_variant TEXT NOT NULL,
  reasoning TEXT,
  send_timing_suggestion TEXT,
  follow_up_strategy TEXT,
  
  -- Context used for generation
  generation_context JSONB,
  
  -- Tracking
  generated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE campaign_contact_linkedin_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view LinkedIn messages"
  ON campaign_contact_linkedin_messages FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create LinkedIn messages"
  ON campaign_contact_linkedin_messages FOR INSERT
  WITH CHECK (auth.uid() = generated_by);

CREATE POLICY "Admins can delete LinkedIn messages"
  ON campaign_contact_linkedin_messages FOR DELETE
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Indexes for performance
CREATE INDEX idx_linkedin_messages_contact ON campaign_contact_linkedin_messages(contact_id);
CREATE INDEX idx_linkedin_messages_campaign ON campaign_contact_linkedin_messages(campaign_id);
CREATE INDEX idx_linkedin_messages_created_at ON campaign_contact_linkedin_messages(created_at DESC);
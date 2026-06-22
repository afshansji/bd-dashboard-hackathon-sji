-- Create campaign_emails table for email history tracking
CREATE TABLE campaign_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES campaign_contacts(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES bd_campaigns(id) ON DELETE CASCADE,
  sent_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Email details
  to_email TEXT NOT NULL,
  cc_emails TEXT[],
  bcc_emails TEXT[],
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  
  -- Metadata
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  sendgrid_message_id TEXT,
  
  -- Tracking
  status TEXT DEFAULT 'sent',
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_campaign_emails_contact ON campaign_emails(contact_id);
CREATE INDEX idx_campaign_emails_campaign ON campaign_emails(campaign_id);
CREATE INDEX idx_campaign_emails_sent_by ON campaign_emails(sent_by);
CREATE INDEX idx_campaign_emails_sent_at ON campaign_emails(sent_at DESC);

-- RLS Policies
ALTER TABLE campaign_emails ENABLE ROW LEVEL SECURITY;

-- Users can view emails for contacts in campaigns they own or are part of
CREATE POLICY "Users can view campaign emails"
  ON campaign_emails FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bd_campaigns c
      WHERE c.id = campaign_emails.campaign_id
      AND (c.owned_by = auth.uid() OR c.created_by = auth.uid())
    )
  );

-- Users can send emails for contacts in campaigns they own or are part of
CREATE POLICY "Users can send campaign emails"
  ON campaign_emails FOR INSERT
  WITH CHECK (
    sent_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM bd_campaigns c
      WHERE c.id = campaign_emails.campaign_id
      AND (c.owned_by = auth.uid() OR c.created_by = auth.uid())
    )
  );

-- Trigger to update updated_at
CREATE TRIGGER update_campaign_emails_updated_at
  BEFORE UPDATE ON campaign_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
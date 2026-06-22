-- Enhance followups table with new fields for automation and AI features
ALTER TABLE followups
ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES deals(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS campaign_contact_id uuid REFERENCES campaign_contacts(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS followup_type text NOT NULL DEFAULT 'email',
ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS ai_generated_message text,
ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS reminder_sent boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_generated boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Add constraints only if columns were just created
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'followups_status_check'
  ) THEN
    ALTER TABLE followups ADD CONSTRAINT followups_status_check 
      CHECK (status IN ('pending', 'completed', 'cancelled', 'overdue'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'followups_followup_type_check'
  ) THEN
    ALTER TABLE followups ADD CONSTRAINT followups_followup_type_check 
      CHECK (followup_type IN ('email', 'call', 'linkedin', 'meeting', 'other'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'followups_priority_check'
  ) THEN
    ALTER TABLE followups ADD CONSTRAINT followups_priority_check 
      CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_followups_user_status ON followups(user_id, status);
CREATE INDEX IF NOT EXISTS idx_followups_date ON followups(date);
CREATE INDEX IF NOT EXISTS idx_followups_deal_id ON followups(deal_id);
CREATE INDEX IF NOT EXISTS idx_followups_campaign_contact_id ON followups(campaign_contact_id);

-- Create function to auto-update overdue status
CREATE OR REPLACE FUNCTION update_overdue_followups()
RETURNS void AS $$
BEGIN
  UPDATE followups
  SET status = 'overdue'
  WHERE status = 'pending'
    AND date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create table for follow-up suggestions
CREATE TABLE IF NOT EXISTS followup_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE,
  campaign_contact_id uuid REFERENCES campaign_contacts(id) ON DELETE CASCADE,
  suggested_date date NOT NULL,
  suggested_type text NOT NULL,
  suggested_priority text NOT NULL,
  reasoning text NOT NULL,
  ai_message_draft text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  accepted_at timestamp with time zone,
  rejected_at timestamp with time zone,
  created_followup_id uuid REFERENCES followups(id) ON DELETE SET NULL
);

-- Enable RLS on followup_suggestions
ALTER TABLE followup_suggestions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own suggestions" ON followup_suggestions;
DROP POLICY IF EXISTS "Users can create own suggestions" ON followup_suggestions;
DROP POLICY IF EXISTS "Users can update own suggestions" ON followup_suggestions;
DROP POLICY IF EXISTS "Admins can view all suggestions" ON followup_suggestions;

-- RLS policies for followup_suggestions
CREATE POLICY "Users can view own suggestions"
  ON followup_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own suggestions"
  ON followup_suggestions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own suggestions"
  ON followup_suggestions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all suggestions"
  ON followup_suggestions FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );
-- Add tracking columns to campaign_contact_linkedin_messages for response tracking and sequence support
ALTER TABLE public.campaign_contact_linkedin_messages
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS variant_sent TEXT,
ADD COLUMN IF NOT EXISTS response_received BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS response_type TEXT CHECK (response_type IN ('positive', 'neutral', 'negative', 'no_response')),
ADD COLUMN IF NOT EXISTS response_received_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS sequence_id UUID,
ADD COLUMN IF NOT EXISTS sequence_step_order INTEGER;

-- Create index for sequence queries
CREATE INDEX IF NOT EXISTS idx_linkedin_messages_sequence_id ON public.campaign_contact_linkedin_messages(sequence_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_messages_sent_at ON public.campaign_contact_linkedin_messages(sent_at);

-- Create analytics view for performance tracking
CREATE OR REPLACE VIEW public.linkedin_message_analytics AS
SELECT 
  campaign_id,
  message_type,
  COUNT(*) as total_generated,
  COUNT(sent_at) as total_sent,
  COUNT(CASE WHEN response_received = true THEN 1 END) as total_responses,
  COUNT(CASE WHEN response_type = 'positive' THEN 1 END) as positive_responses,
  COUNT(CASE WHEN response_type = 'neutral' THEN 1 END) as neutral_responses,
  COUNT(CASE WHEN response_type = 'negative' THEN 1 END) as negative_responses,
  ROUND(
    (COUNT(CASE WHEN response_received = true THEN 1 END)::numeric / NULLIF(COUNT(sent_at), 0)::numeric) * 100, 
    2
  ) as response_rate_percent
FROM public.campaign_contact_linkedin_messages
GROUP BY campaign_id, message_type;
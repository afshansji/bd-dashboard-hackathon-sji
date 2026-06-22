-- Add missing status values to campaign_contacts check constraint
-- This migration adds support for:
-- - client_not_ideal: Client does not fit ideal customer profile
-- - client_not_responsive: Client has not responded to outreach
-- - contacted_social: Contact made via social media (generic)

-- Drop the old constraint
ALTER TABLE public.campaign_contacts
DROP CONSTRAINT IF EXISTS valid_contact_status;

-- Add the new constraint with all status values including the missing ones
ALTER TABLE public.campaign_contacts
ADD CONSTRAINT valid_contact_status CHECK (status IN (
  'identified',
  'researched',
  'contacted_linkedin',
  'contacted_facebook',
  'contacted_instagram',
  'connected',
  'messaged',
  'contacted_email',
  'responded',
  'meeting_booked',
  'close_lost',
  'won',
  'client_not_ideal',
  'client_not_responsive',
  'contacted_social'
));
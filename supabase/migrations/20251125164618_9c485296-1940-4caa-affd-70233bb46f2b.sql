-- Add new status values to campaign_contacts check constraint
-- This migration adds support for:
-- - close_lost: Deal did not close
-- - won: Deal won successfully
-- - contacted_facebook: Facebook connection/follow request sent
-- - contacted_instagram: Instagram follow request sent

-- Drop the old constraint
ALTER TABLE public.campaign_contacts 
DROP CONSTRAINT IF EXISTS valid_contact_status;

-- Add the new constraint with all status values including new ones
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
  'won'
));
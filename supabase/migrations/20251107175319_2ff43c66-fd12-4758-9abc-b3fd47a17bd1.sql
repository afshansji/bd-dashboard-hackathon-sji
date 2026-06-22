-- Drop the old constraint that doesn't include 'archived'
ALTER TABLE bd_campaigns 
DROP CONSTRAINT IF EXISTS bd_campaigns_status_check;

-- Add new constraint with 'archived' included
ALTER TABLE bd_campaigns 
ADD CONSTRAINT bd_campaigns_status_check 
CHECK (status IN ('planning', 'active', 'paused', 'completed', 'archived'));
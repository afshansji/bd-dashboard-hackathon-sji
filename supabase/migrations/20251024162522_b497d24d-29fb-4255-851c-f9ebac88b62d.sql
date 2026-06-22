-- Add status column to deals table
ALTER TABLE deals 
ADD COLUMN status text DEFAULT 'active';

-- Add constraint for valid status values
ALTER TABLE deals
ADD CONSTRAINT deals_status_check 
CHECK (status IN ('active', 'won', 'lost', 'on_hold'));

-- Create index for filtering by status
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deals_stage_status ON deals(stage, status);

-- Backfill existing deals based on control_tower_status or stage
UPDATE deals
SET status = CASE
  WHEN stage = 'closed_won' THEN 'won'
  WHEN stage = 'closed_lost' THEN 'lost'
  WHEN control_tower_status IN ('won', 'lost', 'on_hold') THEN control_tower_status
  ELSE 'active'
END
WHERE status = 'active';

-- Create trigger to auto-sync status from stage changes
CREATE OR REPLACE FUNCTION sync_deal_status_from_stage()
RETURNS TRIGGER AS $$
BEGIN
  -- Only auto-update if moving to closed stages
  IF NEW.stage = 'closed_won' AND OLD.status != 'won' THEN
    NEW.status := 'won';
  ELSIF NEW.stage = 'closed_lost' AND OLD.status != 'lost' THEN
    NEW.status := 'lost';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_deal_status
BEFORE UPDATE ON deals
FOR EACH ROW
EXECUTE FUNCTION sync_deal_status_from_stage();
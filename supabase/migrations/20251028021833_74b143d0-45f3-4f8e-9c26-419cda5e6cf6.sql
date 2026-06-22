-- Add executed_by column to ai_agent_runs table to track which user triggered the agent run
ALTER TABLE ai_agent_runs 
ADD COLUMN IF NOT EXISTS executed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for performance when querying by user
CREATE INDEX IF NOT EXISTS idx_ai_agent_runs_executed_by ON ai_agent_runs(executed_by);

-- Add comment for documentation
COMMENT ON COLUMN ai_agent_runs.executed_by IS 'User who triggered the agent run. NULL for system-initiated runs.';
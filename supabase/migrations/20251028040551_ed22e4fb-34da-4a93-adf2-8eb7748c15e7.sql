-- Add provider_chain column to ai_agent_runs table
ALTER TABLE ai_agent_runs 
ADD COLUMN IF NOT EXISTS provider_chain jsonb;

-- Add index for performance (useful for analyzing provider usage patterns)
CREATE INDEX IF NOT EXISTS idx_ai_agent_runs_provider_chain 
ON ai_agent_runs USING gin(provider_chain);

-- Add comment for documentation
COMMENT ON COLUMN ai_agent_runs.provider_chain IS 
'Telemetry data from AI providers used during execution. Tracks which providers were tried, their success/failure, tokens used, etc.';
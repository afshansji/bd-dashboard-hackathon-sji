-- Add execution_context column to ai_agent_runs table
ALTER TABLE ai_agent_runs 
ADD COLUMN IF NOT EXISTS execution_context jsonb;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_ai_agent_runs_execution_context 
ON ai_agent_runs USING gin(execution_context);

-- Add comment for documentation
COMMENT ON COLUMN ai_agent_runs.execution_context IS 
'The full execution context passed to the agent, including user data, campaign info, contact details, etc.';

-- Update BD Research Analyst agent to mention JSON in system prompt
UPDATE ai_agents
SET system_prompt = CONCAT(
  COALESCE(system_prompt, ''),
  E'\n\nIMPORTANT: Always respond with valid JSON format following the structure defined in the prompt template.'
)
WHERE slug = 'bd-research-analyst' 
AND (system_prompt IS NULL OR system_prompt NOT LIKE '%valid JSON format%');

-- Update LinkedIn Message Generator agent to mention JSON in system prompt
UPDATE ai_agents
SET system_prompt = CONCAT(
  COALESCE(system_prompt, ''),
  E'\n\nIMPORTANT: Always respond with valid JSON format as specified in the output format section.'
)
WHERE slug = 'linkedin-message-generator'
AND (system_prompt IS NULL OR system_prompt NOT LIKE '%valid JSON format%');
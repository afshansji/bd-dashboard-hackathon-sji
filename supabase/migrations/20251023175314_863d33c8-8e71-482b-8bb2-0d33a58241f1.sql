-- Add prompt template and file selection config to ai_agents
ALTER TABLE ai_agents 
ADD COLUMN IF NOT EXISTS prompt_template TEXT,
ADD COLUMN IF NOT EXISTS file_selection_config JSONB DEFAULT '{}'::jsonb;

-- Enhance ai_agent_runs table for file-based analysis
ALTER TABLE ai_agent_runs
ADD COLUMN IF NOT EXISTS selected_file_ids UUID[],
ADD COLUMN IF NOT EXISTS user_context TEXT,
ADD COLUMN IF NOT EXISTS structured_output JSONB;

-- Insert 3 BD-focused AI agents
INSERT INTO ai_agents (name, description, type, prompt_template, config, is_active, file_selection_config)
VALUES
(
  'Deal Status Intelligence',
  'Analyzes meeting notes and documents to provide deal status summary, identify blockers, and recommend next steps',
  'deal_analysis',
  'You are a business development analyst. Review the following deal documents and meeting notes.

**Deal Context:**
Deal: {{deal_title}}
Stage: {{deal_stage}}
Client: {{client_name}}

**Documents Provided:**
{{file_contents}}

**Additional Context from User:**
{{user_context}}

**Your Task:**
1. Summarize the current deal status based on all documents
2. Identify any blockers, risks, or red flags
3. List concrete next steps with priority levels
4. Provide a confidence score (1-10) for deal closure

**Output Format (JSON):**
{
  "summary": "2-3 sentence deal status summary",
  "confidence_score": 7,
  "blockers": ["blocker 1", "blocker 2"],
  "risks": ["risk 1", "risk 2"],
  "next_steps": [
    {"action": "specific action", "priority": "high|medium|low", "owner": "suggested owner"}
  ],
  "key_insights": ["insight 1", "insight 2"]
}',
  '{"providers": {"primary": {"provider": "openai", "model": "gpt-4o", "temperature": 0.3}}}'::jsonb,
  true,
  '{"min_files": 1, "max_files": 10, "suggested_types": ["meeting_notes", "emails", "proposals"]}'::jsonb
),
(
  'Proposal Gap Analysis',
  'Compares client requirements against proposal documents to identify gaps and improvement opportunities',
  'proposal_review',
  'You are a proposal quality analyst. Compare the client requirements with the submitted proposal.

**Deal Context:**
Deal: {{deal_title}}
Client: {{client_name}}
Stage: {{deal_stage}}

**Documents Provided:**
{{file_contents}}

**Additional Context:**
{{user_context}}

**Your Task:**
1. Identify all stated client requirements
2. Map which requirements are addressed in the proposal
3. Flag any gaps or weaknesses in our proposal
4. Suggest specific improvements or additions

**Output Format (JSON):**
{
  "requirements_identified": [
    {"requirement": "description", "addressed": true, "strength": "strong|moderate|weak"}
  ],
  "gaps": [
    {"gap": "what is missing", "impact": "high|medium|low", "recommendation": "how to fix"}
  ],
  "strengths": ["strength 1", "strength 2"],
  "improvement_suggestions": [
    {"area": "section name", "suggestion": "specific improvement", "priority": "high|medium|low"}
  ],
  "overall_score": 7.5
}',
  '{"providers": {"primary": {"provider": "openai", "model": "gpt-4o", "temperature": 0.2}}}'::jsonb,
  true,
  '{"min_files": 2, "max_files": 8, "suggested_types": ["requirements", "proposals", "rfp"]}'::jsonb
),
(
  'Client Objection Handler',
  'Analyzes client objections and provides evidence-based responses using deal history and documentation',
  'objection_handling',
  'You are a sales objection handling specialist. Review the client objection and all relevant deal documents.

**Deal Context:**
Deal: {{deal_title}}
Client: {{client_name}}
Current Stage: {{deal_stage}}

**Client Objection/Concern:**
{{user_context}}

**Supporting Documents:**
{{file_contents}}

**Your Task:**
1. Analyze the objection and identify the underlying concern
2. Find evidence in our documents that addresses this concern
3. Craft a persuasive, evidence-based response
4. Suggest follow-up actions to reinforce the response

**Output Format (JSON):**
{
  "objection_analysis": {
    "stated_concern": "what client said",
    "underlying_concern": "root issue",
    "objection_type": "price|timeline|capabilities|trust|other"
  },
  "evidence_found": [
    {"document": "file name", "evidence": "relevant quote or fact", "relevance": "why this helps"}
  ],
  "recommended_response": {
    "main_points": ["point 1", "point 2"],
    "tone": "empathetic|confident|consultative",
    "full_response": "complete response text"
  },
  "follow_up_actions": [
    {"action": "specific follow-up", "timing": "immediate|this week|next meeting"}
  ],
  "success_probability": 7
}',
  '{"providers": {"primary": {"provider": "openai", "model": "gpt-4o", "temperature": 0.4}}}'::jsonb,
  true,
  '{"min_files": 1, "max_files": 12, "suggested_types": ["meeting_notes", "proposals", "case_studies", "testimonials"]}'::jsonb
)
ON CONFLICT DO NOTHING;
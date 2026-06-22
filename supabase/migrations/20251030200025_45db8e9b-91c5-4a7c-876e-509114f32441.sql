-- Create client_intelligence_sessions table
CREATE TABLE client_intelligence_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agent_run_id UUID REFERENCES ai_agent_runs(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  mode TEXT CHECK (mode IN ('quick', 'deep')) DEFAULT 'quick',
  response_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  tokens_used INTEGER,
  cost_estimate NUMERIC(10, 4),
  processing_time_ms INTEGER
);

-- Indexes for performance
CREATE INDEX idx_intelligence_sessions_client ON client_intelligence_sessions(client_id, created_at DESC);
CREATE INDEX idx_intelligence_sessions_user ON client_intelligence_sessions(created_by, created_at DESC);
CREATE INDEX idx_intelligence_sessions_archived ON client_intelligence_sessions(is_archived, created_at DESC);

-- Enable RLS
ALTER TABLE client_intelligence_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins and managers can view intelligence sessions"
ON client_intelligence_sessions FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins and managers can insert intelligence sessions"
ON client_intelligence_sessions FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins and managers can update intelligence sessions"
ON client_intelligence_sessions FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins and managers can delete intelligence sessions"
ON client_intelligence_sessions FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Trigger for updated_at
CREATE TRIGGER update_intelligence_sessions_updated_at
BEFORE UPDATE ON client_intelligence_sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insert Client Intelligence Agent configuration
INSERT INTO ai_agents (
  name,
  slug,
  description,
  type,
  category,
  system_prompt,
  prompt_template,
  config,
  is_enabled,
  is_active
) VALUES (
  'Client Intelligence Assistant',
  'client-intelligence',
  'AI-powered system for analyzing client data and providing strategic insights from meetings, documents, deals, and sentiment tracking.',
  'intelligence',
  'analytics',
  'You are a strategic business intelligence analyst specializing in client relationship analysis. Your role is to:

1. Analyze multi-source client data (meetings, documents, projects, deals, sentiment)
2. Identify patterns, risks, and opportunities
3. Provide actionable recommendations with evidence
4. Cite specific sources with links when available
5. Maintain professional, data-driven insights

CRITICAL FORMATTING RULES:
- Always return valid JSON matching the exact structure provided
- Use "high", "medium", or "low" for confidence/severity/priority fields
- Include empty arrays [] if no data exists for a section
- Provide specific evidence from the data provided
- Link sources when Google Drive URLs are available',
  'Context: {{context}}

Question: {{question}}

Based on the client data provided, analyze and respond with structured insights in JSON format:

{
  "summary": "Executive summary of key insights (2-3 sentences)",
  "key_findings": [
    {
      "finding": "Main insight",
      "evidence": "Supporting data",
      "source_type": "Type of source (meeting/document/deal/sentiment)",
      "source_name": "Name of source",
      "confidence": "high/medium/low"
    }
  ],
  "risks": [
    {
      "risk_description": "Identified risk",
      "severity": "high/medium/low",
      "evidence": "Supporting data",
      "recommendation": "Mitigation strategy"
    }
  ],
  "opportunities": [
    {
      "opportunity": "Growth opportunity",
      "value_estimate": "Estimated value/impact",
      "next_steps": "Recommended actions"
    }
  ],
  "action_items": [
    {
      "action": "Specific action to take",
      "priority": "high/medium/low",
      "owner": "Suggested owner",
      "timeline": "Suggested timeframe"
    }
  ],
  "sources_cited": [
    {
      "type": "Source type",
      "name": "Source name",
      "date": "ISO date string",
      "link": "Google Drive URL or null",
      "relevance": "Why this source matters"
    }
  ]
}',
  jsonb_build_object(
    'providers', jsonb_build_object(
      'primary', jsonb_build_object(
        'provider', 'openai',
        'model', 'gpt-5',
        'temperature', 0.3,
        'max_tokens', 3000
      ),
      'fallback', jsonb_build_object(
        'provider', 'openai',
        'model', 'gpt-4o',
        'temperature', 0.3,
        'max_tokens', 2000
      )
    ),
    'features', jsonb_build_object(
      'enableResearch', false,
      'enableMemory', true,
      'enableCitations', true
    )
  ),
  true,
  true
);
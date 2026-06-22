-- Create collabai_agents table for local storage
CREATE TABLE collabai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES collabai_integrations(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  agent_type TEXT,
  is_active BOOLEAN DEFAULT true,
  sample_questions JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(integration_id, agent_id)
);

-- Indexes for performance
CREATE INDEX idx_collabai_agents_integration ON collabai_agents(integration_id);
CREATE INDEX idx_collabai_agents_agent_id ON collabai_agents(agent_id);

-- Enable RLS
ALTER TABLE collabai_agents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own agents"
  ON collabai_agents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collabai_integrations ci
      WHERE ci.id = collabai_agents.integration_id
      AND ci.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage agents"
  ON collabai_agents FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Drop collabai_chats table (no longer needed)
DROP TABLE IF EXISTS collabai_chats CASCADE;

-- Update collabai_integrations table
ALTER TABLE collabai_integrations 
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS agents_count INTEGER DEFAULT 0;
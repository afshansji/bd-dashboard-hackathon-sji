-- Add missing Control Tower fields to deals table

-- Pipeline and work type
ALTER TABLE deals ADD COLUMN IF NOT EXISTS pipeline TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS type_of_work TEXT;

-- Estimate URLs
ALTER TABLE deals ADD COLUMN IF NOT EXISTS estimate_url TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS internal_estimate_doc_url TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS client_estimate_doc_url TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS estimate_task_link TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS internal_estimate_doc_link TEXT;

-- Proposal and collaboration URLs
ALTER TABLE deals ADD COLUMN IF NOT EXISTS pandadoc_proposal_url TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS collaborative_ai TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS collaborative_ai_link TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS workboard_ai_link TEXT;

-- CRM URLs
ALTER TABLE deals ADD COLUMN IF NOT EXISTS leadslift_crm_deal_url TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS client_agent_url TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS client_agent_folder TEXT;

-- Create indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_deals_pipeline ON deals(pipeline);
CREATE INDEX IF NOT EXISTS idx_deals_type_of_work ON deals(type_of_work);
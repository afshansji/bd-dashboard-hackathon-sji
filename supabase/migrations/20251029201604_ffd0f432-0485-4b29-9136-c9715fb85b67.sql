-- Add items column to checklist_templates to match edge function expectations
ALTER TABLE checklist_templates 
ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb;

-- Make stage nullable to allow universal templates
ALTER TABLE checklist_templates 
ALTER COLUMN stage DROP NOT NULL;

-- Create default checklist templates for each pipeline stage
INSERT INTO checklist_templates (name, stage, items, is_active) VALUES
(
  'Prospecting Checklist',
  'prospecting',
  '[
    {"title": "Initial contact made", "order_index": 0},
    {"title": "Company research completed", "order_index": 1},
    {"title": "Decision maker identified", "order_index": 2},
    {"title": "Pain points documented", "order_index": 3},
    {"title": "Budget range discussed", "order_index": 4}
  ]'::jsonb,
  true
),
(
  'Qualification Checklist',
  'qualification',
  '[
    {"title": "Budget confirmed", "order_index": 0},
    {"title": "Timeline established", "order_index": 1},
    {"title": "Stakeholders identified", "order_index": 2},
    {"title": "Requirements gathered", "order_index": 3},
    {"title": "Technical feasibility assessed", "order_index": 4},
    {"title": "Competition analysis completed", "order_index": 5}
  ]'::jsonb,
  true
),
(
  'Proposal Checklist',
  'proposal',
  '[
    {"title": "Scope of work defined", "order_index": 0},
    {"title": "Pricing strategy approved", "order_index": 1},
    {"title": "Proposal document created", "order_index": 2},
    {"title": "Proposal reviewed internally", "order_index": 3},
    {"title": "Proposal sent to client", "order_index": 4},
    {"title": "Follow-up scheduled", "order_index": 5}
  ]'::jsonb,
  true
),
(
  'Negotiation Checklist',
  'negotiation',
  '[
    {"title": "Client feedback received", "order_index": 0},
    {"title": "Contract terms negotiated", "order_index": 1},
    {"title": "Pricing adjustments reviewed", "order_index": 2},
    {"title": "Legal review completed", "order_index": 3},
    {"title": "Final contract prepared", "order_index": 4},
    {"title": "Signatures obtained", "order_index": 5}
  ]'::jsonb,
  true
),
(
  'Estimation Checklist',
  'estimation',
  '[
    {"title": "Technical requirements documented", "order_index": 0},
    {"title": "Resource allocation planned", "order_index": 1},
    {"title": "Timeline estimate created", "order_index": 2},
    {"title": "Cost breakdown prepared", "order_index": 3},
    {"title": "Risk assessment completed", "order_index": 4},
    {"title": "Estimate reviewed with PM", "order_index": 5}
  ]'::jsonb,
  true
),
(
  'Universal Checklist',
  NULL,
  '[
    {"title": "Client communication logged", "order_index": 0},
    {"title": "Next steps documented", "order_index": 1},
    {"title": "CRM updated", "order_index": 2}
  ]'::jsonb,
  true
)
ON CONFLICT DO NOTHING;
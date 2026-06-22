-- Update deal checklist templates with correct items
-- This replaces the old checklist items with the new standard checklist

-- First, delete all existing templates
DELETE FROM checklist_templates;

-- Insert the new Universal Deal Checklist with all the correct items
INSERT INTO checklist_templates (name, stage, items, is_active) VALUES
(
  'Deal Checklist',
  NULL,  -- NULL stage means it applies to all stages
  '[
    {"title": "Check for duplicate leads", "order_index": 0},
    {"title": "Verify assignee time zone", "order_index": 1},
    {"title": "Create lead in CRM and Collab AI", "order_index": 2},
    {"title": "Ensure GHL deal is added to CRM and Leadlifts", "order_index": 3},
    {"title": "Confirm client budget and timeline", "order_index": 4},
    {"title": "Clarify payment terms", "order_index": 5},
    {"title": "If task exists in Estimate Project, update sales stage accordingly", "order_index": 6},
    {"title": "Verify proposal matches exact amount; if no proposal, consult PM", "order_index": 7},
    {"title": "Check estimate drive doc access and place it in the proper folder", "order_index": 8},
    {"title": "Create lead follow-up for the respective manager", "order_index": 9},
    {"title": "Ensure project updates exist in AI before closing", "order_index": 10},
    {"title": "Close the deal as Won or Lost in CRM", "order_index": 11},
    {"title": "Close the Estimate Project task noting Win/Lost and include the Lead AI URL", "order_index": 12},
    {"title": "If Won: email the team naming who followed up and who worked on the proposal; ensure Project Update AI has a Manager", "order_index": 13},
    {"title": "If Lost: record reason, tag the Assistant Manager, and inform", "order_index": 14}
  ]'::jsonb,
  true
);

-- Also create stage-specific templates if needed (optional - can be managed via admin panel)
-- These can be customized later through the Checklist Template Manager









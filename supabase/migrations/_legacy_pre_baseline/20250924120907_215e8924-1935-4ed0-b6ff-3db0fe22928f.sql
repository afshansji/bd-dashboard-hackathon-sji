-- Remove any remaining financial agents and their runs if they exist
DELETE FROM ai_agent_runs WHERE agent_id IN (
  SELECT id FROM ai_agents WHERE category IN ('finance', 'financial') 
  OR slug IN ('expense-analysis', 'income-forecasting', 'cash-flow-analysis')
  OR name ILIKE '%expense%' OR name ILIKE '%income%' OR name ILIKE '%cash flow%'
);

DELETE FROM ai_agents WHERE category IN ('finance', 'financial') 
OR slug IN ('expense-analysis', 'income-forecasting', 'cash-flow-analysis')
OR (name ILIKE '%expense%' OR name ILIKE '%income%' OR name ILIKE '%cash flow%')
AND slug != 'brand-performance-optimization';
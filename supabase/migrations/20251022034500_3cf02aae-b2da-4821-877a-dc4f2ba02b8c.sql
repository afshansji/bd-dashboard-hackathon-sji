-- Clean up foreign key references to brands before dropping
UPDATE clients SET brand_id = NULL WHERE brand_id IS NOT NULL;
UPDATE projects SET brand_id = NULL WHERE brand_id IS NOT NULL;
UPDATE bd_campaigns SET brand_id = NULL WHERE brand_id IS NOT NULL;
UPDATE kpis SET brand_id = NULL WHERE brand_id IS NOT NULL;

-- Drop unused AI/video tables
DROP TABLE IF EXISTS gemini_videos CASCADE;

-- Drop code analysis tables
DROP TABLE IF EXISTS code_repositories CASCADE;
DROP TABLE IF EXISTS code_analyses CASCADE;

-- Drop analytics data if not actively used
DROP TABLE IF EXISTS analytics_data CASCADE;
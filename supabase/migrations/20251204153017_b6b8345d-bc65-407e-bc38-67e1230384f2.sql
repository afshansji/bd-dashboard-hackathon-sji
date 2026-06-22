-- Update PODs: rename, add new, and remove unwanted ones

-- 1. Rename existing PODs
UPDATE pods SET name = 'CodeKnight' WHERE name = 'Codeknight';
UPDATE pods SET name = 'CollabAI/Product POD' WHERE name = 'CollabAI';
UPDATE pods SET name = 'Dev squad' WHERE name = 'Dev squad/Allgorydym';
UPDATE pods SET name = 'LeadsLift' WHERE name = 'LeadsLift/QA';

-- 2. Add new PODs (only if they don't exist)
INSERT INTO pods (name, description, is_active)
SELECT 'QA', 'Quality Assurance POD', true
WHERE NOT EXISTS (SELECT 1 FROM pods WHERE name = 'QA');

INSERT INTO pods (name, description, is_active)
SELECT 'BD Initial', 'Business Development Initial POD', true
WHERE NOT EXISTS (SELECT 1 FROM pods WHERE name = 'BD Initial');

INSERT INTO pods (name, description, is_active)
SELECT 'Allgorydym', 'Allgorydym POD', true
WHERE NOT EXISTS (SELECT 1 FROM pods WHERE name = 'Allgorydym');

INSERT INTO pods (name, description, is_active)
SELECT 'Avengers', 'Avengers POD', true
WHERE NOT EXISTS (SELECT 1 FROM pods WHERE name = 'Avengers');

INSERT INTO pods (name, description, is_active)
SELECT 'Marketing', 'Marketing POD', true
WHERE NOT EXISTS (SELECT 1 FROM pods WHERE name = 'Marketing');

-- 3. Remove PM POD and Sales (set inactive instead of delete to preserve data integrity)
UPDATE pods SET is_active = false WHERE name IN ('PM POD', 'Sales');
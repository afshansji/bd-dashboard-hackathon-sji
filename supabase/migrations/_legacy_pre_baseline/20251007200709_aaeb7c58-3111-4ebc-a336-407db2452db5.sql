-- Assign owners to brands without owners (Brand B and Brand C)
-- Get the first super_admin user and assign them as the owner
UPDATE brands 
SET owner_id = (
  SELECT id 
  FROM users 
  WHERE role = 'super_admin' 
  ORDER BY created_at 
  LIMIT 1
)
WHERE owner_id IS NULL AND name IN ('Brand B', 'Brand C');
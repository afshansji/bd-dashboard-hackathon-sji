-- Update shahed@sjinnovation.com to super_admin role
UPDATE users 
SET role = 'super_admin'::app_role, updated_at = now()
WHERE email = 'shahed@sjinnovation.com';
-- Clean up orphaned user record that exists in users table but not in auth.users
-- This will allow recreating the user properly
DELETE FROM users WHERE email = 'shahed@sjinnovation.com' AND id NOT IN (
  SELECT id FROM auth.users WHERE email = 'shahed@sjinnovation.com'
);
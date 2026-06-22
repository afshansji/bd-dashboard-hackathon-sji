-- Assign super_admin role to shahed@sjinnovation.com
-- First, remove the default team_member role
DELETE FROM user_roles
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'shahed@sjinnovation.com')
  AND role = 'team_member';

-- Then assign super_admin role
INSERT INTO user_roles (user_id, role)
SELECT id, 'super_admin'::app_role
FROM auth.users
WHERE email = 'shahed@sjinnovation.com'
ON CONFLICT (user_id, role) DO NOTHING;
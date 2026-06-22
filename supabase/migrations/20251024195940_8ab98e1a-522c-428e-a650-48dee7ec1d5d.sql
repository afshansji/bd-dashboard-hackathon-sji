-- Grant super_admin access to akramul.hoque@sjinnovation.com
UPDATE user_roles 
SET role = 'super_admin'
WHERE user_id = '09fb07e6-a264-4b22-abc1-fb50848fc6a2';
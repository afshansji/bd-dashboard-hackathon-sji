-- Insert test users into the users table
INSERT INTO public.users (id, email, first_name, last_name, role, password_hash, status) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'shahed@sjinnovation.com', 'Shahed', 'Rahman', 'super_admin', 'placeholder_hash', 'active'),
  ('550e8400-e29b-41d4-a716-446655440002', 'manager@test.com', 'Test', 'Manager', 'manager', 'placeholder_hash', 'active'),
  ('550e8400-e29b-41d4-a716-446655440003', 'pm@test.com', 'Test', 'PM', 'pm', 'placeholder_hash', 'active'),
  ('550e8400-e29b-41d4-a716-446655440004', 'user@test.com', 'Test', 'User', 'user', 'placeholder_hash', 'active')
ON CONFLICT (email) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  status = EXCLUDED.status;
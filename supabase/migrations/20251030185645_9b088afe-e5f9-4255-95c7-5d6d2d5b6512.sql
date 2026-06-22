-- Add pm_control_tower_id column to deals table for tracking PM from Control Tower
ALTER TABLE deals ADD COLUMN IF NOT EXISTS pm_control_tower_id TEXT;

-- Create RPC function to get employee by Control Tower ID (avoids type generation issues)
CREATE OR REPLACE FUNCTION get_employee_by_ct_id(ct_id TEXT)
RETURNS TABLE (
  full_name TEXT,
  email TEXT,
  phone TEXT
) 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT full_name, email, phone
  FROM employees
  WHERE control_tower_id = ct_id
  LIMIT 1;
$$;
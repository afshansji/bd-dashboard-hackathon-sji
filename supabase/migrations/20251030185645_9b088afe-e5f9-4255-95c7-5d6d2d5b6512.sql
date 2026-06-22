-- Add pm_control_tower_id column to deals table for tracking PM from Control Tower
ALTER TABLE deals ADD COLUMN IF NOT EXISTS pm_control_tower_id TEXT;

-- Create employees table (missing baseline for Control Tower sync)
CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  control_tower_id text UNIQUE,
  full_name text NOT NULL,
  email text,
  phone text,
  role text,
  department text,
  is_active boolean DEFAULT true,
  synced_from_control_tower boolean DEFAULT false,
  last_synced_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employees_control_tower_id ON public.employees(control_tower_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees(email);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view employees" ON public.employees;
CREATE POLICY "Authenticated users can view employees"
  ON public.employees FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;
CREATE POLICY "Admins can manage employees"
  ON public.employees FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

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
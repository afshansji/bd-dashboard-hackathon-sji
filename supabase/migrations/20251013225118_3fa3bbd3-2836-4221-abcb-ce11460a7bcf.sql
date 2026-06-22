-- Add missing columns to brands table
ALTER TABLE brands ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);
ALTER TABLE brands ADD COLUMN IF NOT EXISTS active_integrations text[] DEFAULT '{}';
ALTER TABLE brands ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Create unique constraint on slug
CREATE UNIQUE INDEX IF NOT EXISTS brands_slug_key ON brands(slug);

-- Add missing columns to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_person text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS postal_code text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS revenue numeric;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS employee_count integer;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS hubspot_id text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_contact_date date;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);

-- Create brand_kpis table
CREATE TABLE IF NOT EXISTS brand_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  description text,
  current_value numeric NOT NULL DEFAULT 0,
  target_value numeric,
  source text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for brand_kpis
CREATE INDEX IF NOT EXISTS brand_kpis_brand_id_idx ON brand_kpis(brand_id);

-- Enable RLS on brand_kpis
ALTER TABLE brand_kpis ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for brand_kpis
CREATE POLICY "Authenticated users can view brand KPIs"
  ON brand_kpis FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage brand KPIs"
  ON brand_kpis FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for brand_kpis updated_at
CREATE TRIGGER update_brand_kpis_updated_at
  BEFORE UPDATE ON brand_kpis
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create project_tasks table
CREATE TABLE IF NOT EXISTS project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text DEFAULT 'pending',
  priority text DEFAULT 'medium',
  assigned_to uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  estimated_hours numeric,
  actual_hours numeric,
  due_date date,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for project_tasks
CREATE INDEX IF NOT EXISTS project_tasks_project_id_idx ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS project_tasks_assigned_to_idx ON project_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS project_tasks_status_idx ON project_tasks(status);

-- Enable RLS on project_tasks
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for project_tasks
CREATE POLICY "Users can view tasks assigned to them or created by them"
  ON project_tasks FOR SELECT
  USING (
    auth.uid() = assigned_to OR 
    auth.uid() = created_by OR 
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Users can create tasks"
  ON project_tasks FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update tasks assigned to them"
  ON project_tasks FOR UPDATE
  USING (auth.uid() = assigned_to OR auth.uid() = created_by);

CREATE POLICY "Admins and managers can manage all tasks"
  ON project_tasks FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  );

-- Create trigger for project_tasks updated_at
CREATE TRIGGER update_project_tasks_updated_at
  BEFORE UPDATE ON project_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create brand_analytics_integrations table for n8n analytics
CREATE TABLE IF NOT EXISTS brand_analytics_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  integration_type text NOT NULL,
  webhook_url text NOT NULL,
  webhook_secret text NOT NULL,
  sync_frequency text DEFAULT 'daily',
  data_sources jsonb DEFAULT '[]',
  metadata jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  last_sync_at timestamp with time zone,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for brand_analytics_integrations
CREATE INDEX IF NOT EXISTS brand_analytics_integrations_brand_id_idx ON brand_analytics_integrations(brand_id);

-- Enable RLS on brand_analytics_integrations
ALTER TABLE brand_analytics_integrations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for brand_analytics_integrations
CREATE POLICY "Admins can manage analytics integrations"
  ON brand_analytics_integrations FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view analytics integrations"
  ON brand_analytics_integrations FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Create trigger for brand_analytics_integrations updated_at
CREATE TRIGGER update_brand_analytics_integrations_updated_at
  BEFORE UPDATE ON brand_analytics_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
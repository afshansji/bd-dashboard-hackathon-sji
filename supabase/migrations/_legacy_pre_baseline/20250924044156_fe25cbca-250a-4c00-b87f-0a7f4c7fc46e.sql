-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  website TEXT,
  contact_person TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  industry TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect', 'archived')),
  satisfaction_score INTEGER CHECK (satisfaction_score >= 0 AND satisfaction_score <= 100),
  total_revenue DECIMAL(10,2) DEFAULT 0,
  assigned_manager UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'on_hold', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  budget DECIMAL(10,2),
  actual_cost DECIMAL(10,2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  deadline DATE,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  assigned_team UUID[],
  project_manager UUID,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project tasks table
CREATE TABLE public.project_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'completed', 'blocked')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to UUID,
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2) DEFAULT 0,
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create client communications table
CREATE TABLE public.client_communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  project_id UUID,
  type TEXT NOT NULL DEFAULT 'email' CHECK (type IN ('email', 'call', 'meeting', 'note')),
  subject TEXT,
  content TEXT,
  direction TEXT NOT NULL DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_communications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for clients
CREATE POLICY "Super admins can manage all clients" 
ON public.clients 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE id::text = auth.uid()::text 
  AND role = 'super_admin'::app_role
));

CREATE POLICY "Managers can view and edit clients" 
ON public.clients 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE id::text = auth.uid()::text 
  AND role = ANY(ARRAY['super_admin'::app_role, 'manager'::app_role])
));

CREATE POLICY "PMs can view assigned clients" 
ON public.clients 
FOR SELECT 
USING (
  assigned_manager::text = auth.uid()::text 
  OR EXISTS (
    SELECT 1 FROM users 
    WHERE id::text = auth.uid()::text 
    AND role = ANY(ARRAY['super_admin'::app_role, 'manager'::app_role, 'pm'::app_role])
  )
);

-- Create RLS policies for projects
CREATE POLICY "Super admins can manage all projects" 
ON public.projects 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE id::text = auth.uid()::text 
  AND role = 'super_admin'::app_role
));

CREATE POLICY "Managers and PMs can view and edit projects" 
ON public.projects 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE id::text = auth.uid()::text 
  AND role = ANY(ARRAY['super_admin'::app_role, 'manager'::app_role, 'pm'::app_role])
));

CREATE POLICY "Team members can view assigned projects" 
ON public.projects 
FOR SELECT 
USING (
  project_manager::text = auth.uid()::text 
  OR auth.uid() = ANY(assigned_team)
  OR EXISTS (
    SELECT 1 FROM users 
    WHERE id::text = auth.uid()::text 
    AND role = ANY(ARRAY['super_admin'::app_role, 'manager'::app_role, 'pm'::app_role])
  )
);

-- Create RLS policies for project tasks
CREATE POLICY "Super admins can manage all project tasks" 
ON public.project_tasks 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE id::text = auth.uid()::text 
  AND role = 'super_admin'::app_role
));

CREATE POLICY "Team members can view and edit their assigned tasks" 
ON public.project_tasks 
FOR ALL 
USING (
  assigned_to::text = auth.uid()::text 
  OR EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = project_tasks.project_id 
    AND (p.project_manager::text = auth.uid()::text OR auth.uid() = ANY(p.assigned_team))
  )
  OR EXISTS (
    SELECT 1 FROM users 
    WHERE id::text = auth.uid()::text 
    AND role = ANY(ARRAY['super_admin'::app_role, 'manager'::app_role, 'pm'::app_role])
  )
);

-- Create RLS policies for client communications
CREATE POLICY "Super admins can manage all communications" 
ON public.client_communications 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE id::text = auth.uid()::text 
  AND role = 'super_admin'::app_role
));

CREATE POLICY "Team members can view and create communications" 
ON public.client_communications 
FOR ALL 
USING (
  created_by::text = auth.uid()::text 
  OR EXISTS (
    SELECT 1 FROM users 
    WHERE id::text = auth.uid()::text 
    AND role = ANY(ARRAY['super_admin'::app_role, 'manager'::app_role, 'pm'::app_role])
  )
);

-- Create indexes for better performance
CREATE INDEX idx_clients_status ON public.clients(status);
CREATE INDEX idx_clients_assigned_manager ON public.clients(assigned_manager);
CREATE INDEX idx_projects_client_id ON public.projects(client_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_project_manager ON public.projects(project_manager);
CREATE INDEX idx_project_tasks_project_id ON public.project_tasks(project_id);
CREATE INDEX idx_project_tasks_assigned_to ON public.project_tasks(assigned_to);
CREATE INDEX idx_project_tasks_status ON public.project_tasks(status);
CREATE INDEX idx_client_communications_client_id ON public.client_communications(client_id);
CREATE INDEX idx_client_communications_project_id ON public.client_communications(project_id);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_tasks_updated_at
  BEFORE UPDATE ON public.project_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample clients
INSERT INTO public.clients (name, email, company, contact_person, status, satisfaction_score, assigned_manager, industry) VALUES
('TechCorp Solutions', 'contact@techcorp.com', 'TechCorp Inc.', 'John Smith', 'active', 95, (SELECT id FROM users WHERE role = 'manager' LIMIT 1), 'Technology'),
('RetailPlus Inc', 'hello@retailplus.com', 'RetailPlus', 'Sarah Johnson', 'active', 88, (SELECT id FROM users WHERE role = 'manager' LIMIT 1), 'Retail'),
('StartupXYZ', 'team@startupxyz.io', 'StartupXYZ', 'Mike Chen', 'prospect', 92, (SELECT id FROM users WHERE role = 'pm' LIMIT 1), 'Startup'),
('Global Manufacturing', 'info@globalmanuf.com', 'Global Manufacturing Corp', 'Lisa Wong', 'active', 85, (SELECT id FROM users WHERE role = 'manager' LIMIT 1), 'Manufacturing'),
('HealthcarePlus', 'contact@healthcareplus.org', 'HealthcarePlus', 'Dr. James Wilson', 'active', 97, (SELECT id FROM users WHERE role = 'pm' LIMIT 1), 'Healthcare'),
('EduTech Solutions', 'hello@edutech.edu', 'EduTech Solutions', 'Amanda Brown', 'inactive', 78, (SELECT id FROM users WHERE role = 'pm' LIMIT 1), 'Education');

-- Insert sample projects (using client IDs from above)
INSERT INTO public.projects (client_id, name, description, status, priority, budget, start_date, end_date, deadline, progress, project_manager) 
SELECT 
  c.id,
  CASE 
    WHEN c.name = 'TechCorp Solutions' THEN 'Website Redesign'
    WHEN c.name = 'RetailPlus Inc' THEN 'E-commerce Platform'
    WHEN c.name = 'StartupXYZ' THEN 'Brand Identity Development'
    WHEN c.name = 'Global Manufacturing' THEN 'Digital Marketing Campaign'
    WHEN c.name = 'HealthcarePlus' THEN 'Patient Portal System'
    WHEN c.name = 'EduTech Solutions' THEN 'Learning Management System'
  END,
  CASE 
    WHEN c.name = 'TechCorp Solutions' THEN 'Complete overhaul of corporate website with modern design and functionality'
    WHEN c.name = 'RetailPlus Inc' THEN 'Development of new e-commerce platform with mobile optimization'
    WHEN c.name = 'StartupXYZ' THEN 'Creating comprehensive brand identity including logo, colors, and guidelines'
    WHEN c.name = 'Global Manufacturing' THEN 'Multi-channel digital marketing campaign for Q1 product launch'
    WHEN c.name = 'HealthcarePlus' THEN 'Patient portal development for appointment booking and medical records'
    WHEN c.name = 'EduTech Solutions' THEN 'Custom LMS development for online course delivery'
  END,
  CASE 
    WHEN c.name IN ('TechCorp Solutions', 'RetailPlus Inc') THEN 'in_progress'
    WHEN c.name = 'StartupXYZ' THEN 'completed'
    WHEN c.name = 'Global Manufacturing' THEN 'planning'
    WHEN c.name = 'HealthcarePlus' THEN 'in_progress'
    WHEN c.name = 'EduTech Solutions' THEN 'on_hold'
  END::TEXT,
  CASE 
    WHEN c.name IN ('TechCorp Solutions', 'HealthcarePlus') THEN 'high'
    WHEN c.name IN ('RetailPlus Inc', 'StartupXYZ') THEN 'medium'
    ELSE 'low'
  END::TEXT,
  CASE 
    WHEN c.name = 'TechCorp Solutions' THEN 75000
    WHEN c.name = 'RetailPlus Inc' THEN 120000
    WHEN c.name = 'StartupXYZ' THEN 25000
    WHEN c.name = 'Global Manufacturing' THEN 85000
    WHEN c.name = 'HealthcarePlus' THEN 150000
    WHEN c.name = 'EduTech Solutions' THEN 95000
  END,
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE + INTERVAL '60 days',
  CURRENT_DATE + INTERVAL '90 days',
  CASE 
    WHEN c.name = 'TechCorp Solutions' THEN 65
    WHEN c.name = 'RetailPlus Inc' THEN 40
    WHEN c.name = 'StartupXYZ' THEN 100
    WHEN c.name = 'Global Manufacturing' THEN 15
    WHEN c.name = 'HealthcarePlus' THEN 80
    WHEN c.name = 'EduTech Solutions' THEN 25
  END,
  (SELECT id FROM users WHERE role IN ('pm', 'manager') LIMIT 1)
FROM public.clients c;
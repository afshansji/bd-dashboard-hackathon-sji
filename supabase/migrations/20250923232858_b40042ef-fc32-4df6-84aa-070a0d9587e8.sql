-- Create brands table
CREATE TABLE public.brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_permissions table
CREATE TABLE public.user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_name)
);

-- Create user_brands junction table (many-to-many relationship)
CREATE TABLE public.user_brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  access_level TEXT NOT NULL DEFAULT 'viewer' CHECK (access_level IN ('viewer', 'member', 'owner')),
  can_manage_team BOOLEAN NOT NULL DEFAULT false,
  can_manage_settings BOOLEAN NOT NULL DEFAULT false,
  can_view_analytics BOOLEAN NOT NULL DEFAULT true,
  can_manage_content BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, brand_id)
);

-- Add status column to users table if not exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending'));

-- Enable Row Level Security
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_brands ENABLE ROW LEVEL SECURITY;

-- RLS Policies for brands table
CREATE POLICY "Super admins can view all brands" 
ON public.brands FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.users 
  WHERE users.id::text = auth.uid()::text 
  AND users.role = 'super_admin'::app_role
));

CREATE POLICY "Managers can view all brands" 
ON public.brands FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.users 
  WHERE users.id::text = auth.uid()::text 
  AND users.role = ANY(ARRAY['super_admin'::app_role, 'manager'::app_role])
));

CREATE POLICY "Super admins can manage all brands" 
ON public.brands FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.users 
  WHERE users.id::text = auth.uid()::text 
  AND users.role = 'super_admin'::app_role
));

-- RLS Policies for user_permissions table
CREATE POLICY "Super admins can view all user permissions" 
ON public.user_permissions FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.users 
  WHERE users.id::text = auth.uid()::text 
  AND users.role = 'super_admin'::app_role
));

CREATE POLICY "Super admins can manage all user permissions" 
ON public.user_permissions FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.users 
  WHERE users.id::text = auth.uid()::text 
  AND users.role = 'super_admin'::app_role
));

CREATE POLICY "Users can view their own permissions" 
ON public.user_permissions FOR SELECT 
USING (user_id::text = auth.uid()::text);

-- RLS Policies for user_brands table
CREATE POLICY "Super admins can view all user brand assignments" 
ON public.user_brands FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.users 
  WHERE users.id::text = auth.uid()::text 
  AND users.role = 'super_admin'::app_role
));

CREATE POLICY "Super admins can manage all user brand assignments" 
ON public.user_brands FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.users 
  WHERE users.id::text = auth.uid()::text 
  AND users.role = 'super_admin'::app_role
));

CREATE POLICY "Users can view their own brand assignments" 
ON public.user_brands FOR SELECT 
USING (user_id::text = auth.uid()::text);

-- Create triggers for updated_at columns
CREATE TRIGGER update_brands_updated_at
BEFORE UPDATE ON public.brands
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_permissions_updated_at
BEFORE UPDATE ON public.user_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_brands_updated_at
BEFORE UPDATE ON public.user_brands
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX idx_user_permissions_module ON public.user_permissions(module_name);
CREATE INDEX idx_user_brands_user_id ON public.user_brands(user_id);
CREATE INDEX idx_user_brands_brand_id ON public.user_brands(brand_id);
CREATE INDEX idx_brands_status ON public.brands(status);
CREATE INDEX idx_users_status ON public.users(status);

-- Insert some initial brand data
INSERT INTO public.brands (name, slug, description, status) VALUES 
('Brand A', 'brand-a', 'Description for Brand A', 'active'),
('Brand B', 'brand-b', 'Description for Brand B', 'active'),
('Brand C', 'brand-c', 'Description for Brand C', 'active'),
('Brand D', 'brand-d', 'Description for Brand D', 'inactive');
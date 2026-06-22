-- Create pods table
CREATE TABLE public.pods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  lead_user_id UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add updated_at trigger for pods
CREATE TRIGGER update_pods_updated_at
  BEFORE UPDATE ON public.pods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for pods
ALTER TABLE public.pods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view pods"
  ON public.pods FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage pods"
  ON public.pods FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Create target_niches table
CREATE TABLE public.target_niches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID REFERENCES public.pods(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  services TEXT[] DEFAULT '{}',
  industries TEXT[] DEFAULT '{}',
  target_contacts TEXT[] DEFAULT '{}',
  target_regions TEXT[] DEFAULT '{}',
  employee_size_min INTEGER,
  employee_size_max INTEGER,
  revenue_min NUMERIC,
  revenue_max NUMERIC,
  business_type TEXT,
  pain_points TEXT[] DEFAULT '{}',
  dreams TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'researching', 'paused', 'retired')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  target_revenue NUMERIC,
  target_clients INTEGER,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add updated_at trigger for target_niches
CREATE TRIGGER update_target_niches_updated_at
  BEFORE UPDATE ON public.target_niches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for target_niches
ALTER TABLE public.target_niches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view niches"
  ON public.target_niches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create niches"
  ON public.target_niches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own niches or admins can update all"
  ON public.target_niches FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by OR
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users can delete own niches or admins can delete all"
  ON public.target_niches FOR DELETE
  TO authenticated
  USING (
    auth.uid() = created_by OR
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Create bd_campaigns table
CREATE TABLE public.bd_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  niche_id UUID NOT NULL REFERENCES public.target_niches(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('email_outbound', 'linkedin_outbound', 'cold_calling', 'abm', 'other')),
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'paused', 'completed')),
  start_date DATE,
  end_date DATE,
  target_contacts TEXT[] DEFAULT '{}',
  target_regions TEXT[] DEFAULT '{}',
  target_contacts_count INTEGER DEFAULT 0,
  actual_contacts_reached INTEGER DEFAULT 0,
  responses_received INTEGER DEFAULT 0,
  meetings_booked INTEGER DEFAULT 0,
  deals_generated INTEGER DEFAULT 0,
  owned_by UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add updated_at trigger for bd_campaigns
CREATE TRIGGER update_bd_campaigns_updated_at
  BEFORE UPDATE ON public.bd_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for bd_campaigns
ALTER TABLE public.bd_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view campaigns"
  ON public.bd_campaigns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create campaigns"
  ON public.bd_campaigns FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own campaigns or admins can update all"
  ON public.bd_campaigns FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by OR 
    auth.uid() = owned_by OR
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users can delete own campaigns or admins can delete all"
  ON public.bd_campaigns FOR DELETE
  TO authenticated
  USING (
    auth.uid() = created_by OR
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Create indexes for performance
CREATE INDEX idx_pods_is_active ON public.pods(is_active);
CREATE INDEX idx_pods_lead_user_id ON public.pods(lead_user_id);

CREATE INDEX idx_target_niches_pod_id ON public.target_niches(pod_id);
CREATE INDEX idx_target_niches_status ON public.target_niches(status);
CREATE INDEX idx_target_niches_priority ON public.target_niches(priority);
CREATE INDEX idx_target_niches_created_by ON public.target_niches(created_by);

CREATE INDEX idx_bd_campaigns_niche_id ON public.bd_campaigns(niche_id);
CREATE INDEX idx_bd_campaigns_brand_id ON public.bd_campaigns(brand_id);
CREATE INDEX idx_bd_campaigns_status ON public.bd_campaigns(status);
CREATE INDEX idx_bd_campaigns_owned_by ON public.bd_campaigns(owned_by);
CREATE INDEX idx_bd_campaigns_created_by ON public.bd_campaigns(created_by);
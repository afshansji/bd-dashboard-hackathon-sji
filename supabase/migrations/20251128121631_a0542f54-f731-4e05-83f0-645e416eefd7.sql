-- Create zerobounce_config table
CREATE TABLE IF NOT EXISTS public.zerobounce_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_tested_at TIMESTAMPTZ,
  test_status TEXT,
  test_response JSONB,
  credits_remaining INTEGER,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create zerobounce_validations table
CREATE TABLE IF NOT EXISTS public.zerobounce_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  campaign_contact_id UUID REFERENCES public.campaign_contacts(id) ON DELETE SET NULL,
  validation_status TEXT NOT NULL,
  sub_status TEXT,
  account TEXT,
  domain TEXT,
  did_you_mean TEXT,
  domain_age_days TEXT,
  free_email BOOLEAN,
  mx_found TEXT,
  mx_record TEXT,
  smtp_provider TEXT,
  firstname TEXT,
  lastname TEXT,
  gender TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  zipcode TEXT,
  processed_at TIMESTAMPTZ,
  validation_metadata JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.zerobounce_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zerobounce_validations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for zerobounce_config (super_admin only)
CREATE POLICY "Super admins can manage zerobounce config"
  ON public.zerobounce_config
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies for zerobounce_validations
CREATE POLICY "Super admins can manage all validations"
  ON public.zerobounce_validations
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can view their own validations"
  ON public.zerobounce_validations
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_zerobounce_config_is_active 
  ON public.zerobounce_config(is_active);

CREATE INDEX IF NOT EXISTS idx_zerobounce_validations_email 
  ON public.zerobounce_validations(email);

CREATE INDEX IF NOT EXISTS idx_zerobounce_validations_campaign_contact 
  ON public.zerobounce_validations(campaign_contact_id);

CREATE INDEX IF NOT EXISTS idx_zerobounce_validations_created_by 
  ON public.zerobounce_validations(created_by);
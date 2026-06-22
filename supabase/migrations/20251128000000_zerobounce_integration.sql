-- Zerobounce email validation integration schema

-- 1. Create table to store Zerobounce API configuration
CREATE TABLE IF NOT EXISTS public.zerobounce_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_tested_at TIMESTAMPTZ,
  test_status TEXT CHECK (test_status IN ('success', 'failed', 'pending')),
  test_response JSONB,
  credits_remaining INTEGER,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Only one active configuration at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_zerobounce_config_active
  ON public.zerobounce_config(is_active)
  WHERE is_active = true;

DROP TRIGGER IF EXISTS update_zerobounce_config_updated_at ON public.zerobounce_config;
CREATE TRIGGER update_zerobounce_config_updated_at
  BEFORE UPDATE ON public.zerobounce_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.zerobounce_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage Zerobounce config" ON public.zerobounce_config;
CREATE POLICY "Super admins can manage Zerobounce config"
  ON public.zerobounce_config FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- 2. Create table to store email validation results
CREATE TABLE IF NOT EXISTS public.zerobounce_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  campaign_contact_id UUID REFERENCES public.campaign_contacts(id) ON DELETE CASCADE,
  validation_status TEXT NOT NULL CHECK (validation_status IN (
    'valid',
    'invalid',
    'catch-all',
    'unknown',
    'spamtrap',
    'abuse',
    'do_not_mail'
  )),
  sub_status TEXT,
  account TEXT,
  domain TEXT,
  did_you_mean TEXT,
  domain_age_days INTEGER,
  free_email BOOLEAN,
  mx_found BOOLEAN,
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
  error_message TEXT,
  validation_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_zerobounce_validations_email ON public.zerobounce_validations(email);
CREATE INDEX IF NOT EXISTS idx_zerobounce_validations_contact_id ON public.zerobounce_validations(campaign_contact_id);
CREATE INDEX IF NOT EXISTS idx_zerobounce_validations_status ON public.zerobounce_validations(validation_status);
CREATE INDEX IF NOT EXISTS idx_zerobounce_validations_created_at ON public.zerobounce_validations(created_at DESC);

ALTER TABLE public.zerobounce_validations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view validation results for their campaigns" ON public.zerobounce_validations;
CREATE POLICY "Users can view validation results for their campaigns"
  ON public.zerobounce_validations FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    EXISTS (
      SELECT 1
      FROM public.campaign_contacts cc
      JOIN public.bd_campaigns c ON c.id = cc.campaign_id
      WHERE cc.id = campaign_contact_id
        AND (
          c.created_by = auth.uid() OR
          c.owned_by = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "Users can insert validation results" ON public.zerobounce_validations;
CREATE POLICY "Users can insert validation results"
  ON public.zerobounce_validations FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- 3. Extend campaign_contacts table with validation fields
ALTER TABLE public.campaign_contacts
  ADD COLUMN IF NOT EXISTS email_validation_status TEXT CHECK (email_validation_status IN (
    'pending',
    'valid',
    'invalid',
    'catch-all',
    'unknown',
    'spamtrap',
    'abuse',
    'do_not_mail',
    'not_validated'
  )) DEFAULT 'not_validated',
  ADD COLUMN IF NOT EXISTS email_validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_validation_error TEXT;

-- Create index for filtering by validation status
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_validation_status
  ON public.campaign_contacts(email_validation_status);

-- 4. Extend lead_import_jobs table with validation tracking
ALTER TABLE public.lead_import_jobs
  ADD COLUMN IF NOT EXISTS validation_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS validation_failed_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS validation_failed_emails JSONB DEFAULT '[]'::jsonb;

-- 5. Create function to get active Zerobounce API key
CREATE OR REPLACE FUNCTION public.get_active_zerobounce_api_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  api_key_value TEXT;
BEGIN
  -- Check if user is super_admin
  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Only super admins can access Zerobounce API key';
  END IF;

  SELECT api_key INTO api_key_value
  FROM public.zerobounce_config
  WHERE is_active = true
  LIMIT 1;

  RETURN api_key_value;
END;
$$;

-- 6. Create function to update validation credits
CREATE OR REPLACE FUNCTION public.update_zerobounce_credits(
  p_credits_remaining INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.zerobounce_config
  SET
    credits_remaining = p_credits_remaining,
    updated_at = now(),
    updated_by = auth.uid()
  WHERE is_active = true;
END;
$$;

-- 7. Add comment for documentation
COMMENT ON TABLE public.zerobounce_config IS 'Stores Zerobounce API configuration for email validation';
COMMENT ON TABLE public.zerobounce_validations IS 'Stores detailed email validation results from Zerobounce API';
COMMENT ON COLUMN public.campaign_contacts.email_validation_status IS 'Current email validation status from Zerobounce';

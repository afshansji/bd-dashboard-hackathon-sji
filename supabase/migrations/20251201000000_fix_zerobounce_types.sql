-- Fix Zerobounce data type inconsistencies
-- This migration ensures all zerobounce tables have consistent and correct data types

-- First, check if columns need type adjustments
DO $$ 
BEGIN
  -- Fix domain_age_days to be INTEGER (not TEXT)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'zerobounce_validations' 
    AND column_name = 'domain_age_days' 
    AND data_type = 'text'
  ) THEN
    -- Drop the column if it's TEXT and recreate as INTEGER
    ALTER TABLE public.zerobounce_validations 
      DROP COLUMN IF EXISTS domain_age_days;
    
    ALTER TABLE public.zerobounce_validations 
      ADD COLUMN domain_age_days INTEGER;
  END IF;

  -- Fix mx_found to be BOOLEAN (not TEXT)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'zerobounce_validations' 
    AND column_name = 'mx_found' 
    AND data_type = 'text'
  ) THEN
    -- Drop the column if it's TEXT and recreate as BOOLEAN
    ALTER TABLE public.zerobounce_validations 
      DROP COLUMN IF EXISTS mx_found;
    
    ALTER TABLE public.zerobounce_validations 
      ADD COLUMN mx_found BOOLEAN;
  END IF;

  -- Ensure id column exists with proper default
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'zerobounce_validations' 
    AND column_name = 'id'
  ) THEN
    ALTER TABLE public.zerobounce_validations 
      ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid();
  END IF;

END $$;

-- Ensure all required indexes exist
CREATE INDEX IF NOT EXISTS idx_zerobounce_validations_email 
  ON public.zerobounce_validations(email);

CREATE INDEX IF NOT EXISTS idx_zerobounce_validations_campaign_contact 
  ON public.zerobounce_validations(campaign_contact_id);

CREATE INDEX IF NOT EXISTS idx_zerobounce_validations_status
  ON public.zerobounce_validations(validation_status);

CREATE INDEX IF NOT EXISTS idx_zerobounce_validations_created_by 
  ON public.zerobounce_validations(created_by);

CREATE INDEX IF NOT EXISTS idx_zerobounce_validations_created_at
  ON public.zerobounce_validations(created_at DESC);

-- Ensure RLS is enabled
ALTER TABLE public.zerobounce_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zerobounce_validations ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to ensure they're correct
DROP POLICY IF EXISTS "Super admins can manage zerobounce config" ON public.zerobounce_config;
DROP POLICY IF EXISTS "Super admins can manage Zerobounce config" ON public.zerobounce_config;

CREATE POLICY "Super admins can manage zerobounce config"
  ON public.zerobounce_config
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Drop and recreate validation policies
DROP POLICY IF EXISTS "Super admins can manage all validations" ON public.zerobounce_validations;
DROP POLICY IF EXISTS "Users can view their own validations" ON public.zerobounce_validations;
DROP POLICY IF EXISTS "Users can view validation results for their campaigns" ON public.zerobounce_validations;
DROP POLICY IF EXISTS "Users can insert validation results" ON public.zerobounce_validations;

CREATE POLICY "Super admins can manage all validations"
  ON public.zerobounce_validations
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can view validation results for their campaigns"
  ON public.zerobounce_validations 
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    EXISTS (
      SELECT 1
      FROM public.campaign_contacts cc
      JOIN public.campaigns c ON c.id = cc.campaign_id
      WHERE cc.id = campaign_contact_id
        AND (
          c.created_by = auth.uid() OR
          c.owned_by = auth.uid()
        )
    )
  );

CREATE POLICY "Users can insert validation results"
  ON public.zerobounce_validations 
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Add helpful comments
COMMENT ON TABLE public.zerobounce_config IS 'Stores Zerobounce API configuration for email validation (Super Admin only)';
COMMENT ON TABLE public.zerobounce_validations IS 'Stores detailed email validation results from Zerobounce API';
COMMENT ON COLUMN public.zerobounce_validations.domain_age_days IS 'Age of the email domain in days (INTEGER)';
COMMENT ON COLUMN public.zerobounce_validations.mx_found IS 'Whether MX records were found for the domain (BOOLEAN)';


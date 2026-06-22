-- Migration: Create analytics_api_consumers for external analytics API
-- Created: 2026-02-08
-- Description: Registers external projects that can pull/push usage analytics via edge functions.
-- Notes:
-- - Shared secrets are stored as SHA-256 hashes (api_secret_hash). Never store plaintext secrets.
-- - This table is admin-managed only (RLS enforced).

-- Enable pgcrypto for gen_random_uuid (safe if already enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create table
CREATE TABLE IF NOT EXISTS public.analytics_api_consumers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  api_secret_hash TEXT NOT NULL UNIQUE,
  webhook_url TEXT,
  webhook_secret TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  push_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  push_frequency TEXT NOT NULL DEFAULT 'manual',
  allowed_periods TEXT[] NOT NULL DEFAULT ARRAY['daily','weekly','monthly','all']::text[],
  last_push_at TIMESTAMPTZ,
  last_push_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT analytics_api_consumers_push_frequency_check
    CHECK (push_frequency IN ('daily','weekly','monthly','manual')),
  CONSTRAINT analytics_api_consumers_allowed_periods_check
    CHECK (
      allowed_periods <@ ARRAY['daily','weekly','monthly','all']::text[]
      AND array_length(allowed_periods, 1) IS NOT NULL
      AND array_length(allowed_periods, 1) > 0
    )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_api_consumers_active_push
  ON public.analytics_api_consumers(is_active, push_enabled);

CREATE INDEX IF NOT EXISTS idx_analytics_api_consumers_last_push_at
  ON public.analytics_api_consumers(last_push_at DESC);

-- Enable Row Level Security
ALTER TABLE public.analytics_api_consumers ENABLE ROW LEVEL SECURITY;

-- Policies: Admins and super_admins can manage API consumers
CREATE POLICY "Admins can view analytics API consumers"
  ON public.analytics_api_consumers
  FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert analytics API consumers"
  ON public.analytics_api_consumers
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update analytics API consumers"
  ON public.analytics_api_consumers
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete analytics API consumers"
  ON public.analytics_api_consumers
  FOR DELETE
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
DROP TRIGGER IF EXISTS update_analytics_api_consumers_updated_at ON public.analytics_api_consumers;
CREATE TRIGGER update_analytics_api_consumers_updated_at
  BEFORE UPDATE ON public.analytics_api_consumers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Rollback (commented out)
-- DROP TRIGGER IF EXISTS update_analytics_api_consumers_updated_at ON public.analytics_api_consumers;
-- DROP TABLE IF EXISTS public.analytics_api_consumers;
-- DROP INDEX IF EXISTS idx_analytics_api_consumers_active_push;
-- DROP INDEX IF EXISTS idx_analytics_api_consumers_last_push_at;

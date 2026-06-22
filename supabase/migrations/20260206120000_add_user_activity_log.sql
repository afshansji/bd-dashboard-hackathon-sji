-- Migration: Add user activity logging
-- Created: 2026-02-06
-- Description: Adds user activity log table and profile usage fields
-- Deployment: Run manually in Supabase Dashboard > SQL Editor
-- Rollback: See bottom of file

-- Create user_activity_log table for per-user events
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add usage fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON public.user_activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_action ON public.user_activity_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_resource ON public.user_activity_log(resource_type, resource_id);

-- Enable Row Level Security
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own activity logs"
  ON public.user_activity_log
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins and managers can view all activity logs"
  ON public.user_activity_log
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Users can insert own activity logs"
  ON public.user_activity_log
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Rollback (commented out)
-- DROP TABLE IF EXISTS public.user_activity_log;
-- ALTER TABLE public.profiles
--   DROP COLUMN IF EXISTS last_login,
--   DROP COLUMN IF EXISTS last_seen,
--   DROP COLUMN IF EXISTS login_count;

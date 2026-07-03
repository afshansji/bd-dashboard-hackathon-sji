-- Migration: Meeting Brief — AI-generated discovery call preparation briefs

CREATE TABLE IF NOT EXISTS public.meeting_briefs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.upwork_jobs(id) ON DELETE CASCADE,
  brief_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT meeting_briefs_job_unique UNIQUE (job_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_briefs_job_id
  ON public.meeting_briefs(job_id);

CREATE INDEX IF NOT EXISTS idx_meeting_briefs_created_at
  ON public.meeting_briefs(created_at DESC);

ALTER TABLE public.meeting_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view meeting briefs"
  ON public.meeting_briefs
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert meeting briefs"
  ON public.meeting_briefs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update meeting briefs"
  ON public.meeting_briefs
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_meeting_briefs_updated_at
  BEFORE UPDATE ON public.meeting_briefs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

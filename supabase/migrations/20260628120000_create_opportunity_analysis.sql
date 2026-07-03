-- Migration: Opportunity Intelligence Agent — cached job fit analyses
-- Connects Upwork Jobs with Organizational Memory scoring.

CREATE TABLE IF NOT EXISTS public.opportunity_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.upwork_jobs(id) ON DELETE CASCADE,
  recommendation TEXT NOT NULL
    CHECK (recommendation IN ('PURSUE', 'REVIEW', 'IGNORE')),
  confidence INTEGER NOT NULL
    CHECK (confidence >= 0 AND confidence <= 100),
  analysis_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT opportunity_analysis_job_unique UNIQUE (job_id)
);

CREATE INDEX IF NOT EXISTS idx_opportunity_analysis_job_id
  ON public.opportunity_analysis(job_id);

CREATE INDEX IF NOT EXISTS idx_opportunity_analysis_recommendation
  ON public.opportunity_analysis(recommendation);

CREATE INDEX IF NOT EXISTS idx_opportunity_analysis_created_at
  ON public.opportunity_analysis(created_at DESC);

ALTER TABLE public.opportunity_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view opportunity analyses"
  ON public.opportunity_analysis
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert opportunity analyses"
  ON public.opportunity_analysis
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update opportunity analyses"
  ON public.opportunity_analysis
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_opportunity_analysis_updated_at
  BEFORE UPDATE ON public.opportunity_analysis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: Company Intelligence — cached company research reports for job leads

CREATE TABLE IF NOT EXISTS public.company_intelligence_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.upwork_jobs(id) ON DELETE CASCADE,
  company_website TEXT NOT NULL,
  report_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT company_intelligence_job_unique UNIQUE (job_id)
);

CREATE INDEX IF NOT EXISTS idx_company_intelligence_job_id
  ON public.company_intelligence_reports(job_id);

CREATE INDEX IF NOT EXISTS idx_company_intelligence_created_at
  ON public.company_intelligence_reports(created_at DESC);

ALTER TABLE public.company_intelligence_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view company intelligence reports"
  ON public.company_intelligence_reports
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert company intelligence reports"
  ON public.company_intelligence_reports
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update company intelligence reports"
  ON public.company_intelligence_reports
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_company_intelligence_reports_updated_at
  BEFORE UPDATE ON public.company_intelligence_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

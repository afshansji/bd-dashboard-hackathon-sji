CREATE INDEX IF NOT EXISTS idx_feedback_reports_priority ON public.feedback_reports(priority);

COMMENT ON COLUMN public.feedback_reports.priority IS 'Priority level for feedback: low, medium, high. Optional field for prioritization.';
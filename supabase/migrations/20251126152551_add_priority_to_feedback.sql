-- Add priority column to feedback_reports table
-- Priority levels: low, medium, high (optional field, defaults to NULL)

ALTER TABLE public.feedback_reports
ADD COLUMN priority TEXT NULL CHECK (priority IN ('low', 'medium', 'high'));

-- Create index for priority filtering
CREATE INDEX IF NOT EXISTS idx_feedback_reports_priority ON public.feedback_reports(priority);

-- Set existing records to NULL (optional field)
-- No update needed as new column defaults to NULL

COMMENT ON COLUMN public.feedback_reports.priority IS 'Priority level for feedback: low, medium, high. Optional field for prioritization.';


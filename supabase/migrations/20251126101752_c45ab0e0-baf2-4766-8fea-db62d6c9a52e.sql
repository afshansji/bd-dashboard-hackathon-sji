ALTER TABLE public.feedback_reports
ADD COLUMN priority TEXT NULL CHECK (priority IN ('low', 'medium', 'high'));
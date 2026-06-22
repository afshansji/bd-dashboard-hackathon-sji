-- Add missing current_step column to contact_sequence_enrollments
ALTER TABLE public.contact_sequence_enrollments
  ADD COLUMN IF NOT EXISTS current_step INTEGER NOT NULL DEFAULT 0;

-- Add comment explaining the column
COMMENT ON COLUMN public.contact_sequence_enrollments.current_step IS 'Tracks the current step index in the sequence (0-based). Used to determine which step to execute next and whether the sequence is complete.';

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_enrollments_current_step 
  ON public.contact_sequence_enrollments(current_step);

-- Add index for common query pattern (finding enrollments to process)
CREATE INDEX IF NOT EXISTS idx_enrollments_status_step 
  ON public.contact_sequence_enrollments(status, current_step);

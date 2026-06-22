-- Simplify DHS Module - Remove unnecessary fields and data

-- Step 1: Delete all existing DHS entries
DELETE FROM public.dhs_submissions;

-- Step 2: Drop unnecessary columns
ALTER TABLE public.dhs_submissions
  DROP COLUMN IF EXISTS follow_ups_done,
  DROP COLUMN IF EXISTS calls_made,
  DROP COLUMN IF EXISTS meetings_booked,
  DROP COLUMN IF EXISTS pipeline_updated,
  DROP COLUMN IF EXISTS score,
  DROP COLUMN IF EXISTS status;

-- Step 3: Rename 'notes' to 'content' for clarity
ALTER TABLE public.dhs_submissions
  RENAME COLUMN notes TO content;

-- Step 4: Add comment to table
COMMENT ON TABLE public.dhs_submissions IS 'Daily Head Start submissions - simplified to single text entry with rich formatting';

COMMENT ON COLUMN public.dhs_submissions.content IS 'Rich text content of the DHS submission (supports HTML formatting)';
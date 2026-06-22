-- Create DHS (Daily Head Start) Submissions table
CREATE TABLE IF NOT EXISTS public.dhs_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  follow_ups_done INTEGER DEFAULT 0 CHECK (follow_ups_done >= 0 AND follow_ups_done <= 999),
  calls_made INTEGER DEFAULT 0 CHECK (calls_made >= 0 AND calls_made <= 999),
  meetings_booked INTEGER DEFAULT 0 CHECK (meetings_booked >= 0 AND meetings_booked <= 999),
  pipeline_updated BOOLEAN DEFAULT false,
  score NUMERIC CHECK (score >= 1 AND score <= 10),
  status TEXT CHECK (status IN ('on_track', 'at_risk', 'blocked')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.dhs_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dhs_submissions
-- All authenticated users can view all submissions (per requirement)
CREATE POLICY "All authenticated users can view DHS submissions" 
  ON public.dhs_submissions 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Users can create their own DHS submissions
CREATE POLICY "Users can create own DHS submissions" 
  ON public.dhs_submissions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update only their own submissions for current date
CREATE POLICY "Users can update own DHS submissions" 
  ON public.dhs_submissions 
  FOR UPDATE 
  USING (
    auth.uid() = user_id AND 
    date = CURRENT_DATE
  );

-- Users can delete their own DHS submissions
CREATE POLICY "Users can delete own DHS submissions" 
  ON public.dhs_submissions 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX idx_dhs_submissions_user_date ON public.dhs_submissions(user_id, date DESC);
CREATE INDEX idx_dhs_submissions_date ON public.dhs_submissions(date DESC);
CREATE INDEX idx_dhs_submissions_status ON public.dhs_submissions(status, date DESC) WHERE status IS NOT NULL;

-- Create trigger for automatic updated_at timestamp
CREATE TRIGGER update_dhs_submissions_updated_at
  BEFORE UPDATE ON public.dhs_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT SELECT ON public.dhs_submissions TO authenticated;
GRANT INSERT ON public.dhs_submissions TO authenticated;
GRANT UPDATE ON public.dhs_submissions TO authenticated;
GRANT DELETE ON public.dhs_submissions TO authenticated;


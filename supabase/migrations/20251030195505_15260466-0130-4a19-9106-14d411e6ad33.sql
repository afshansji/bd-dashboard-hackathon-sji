-- Duplicate feedback schema migration (safe for fresh databases)
CREATE TABLE IF NOT EXISTS public.feedback_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature')),
  subject TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'closed')),
  email TEXT,
  attachment_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.feedback_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID NOT NULL REFERENCES public.feedback_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own feedback" ON public.feedback_reports;
CREATE POLICY "Users can view their own feedback"
  ON public.feedback_reports
  FOR SELECT
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can create feedback" ON public.feedback_reports;
CREATE POLICY "Users can create feedback"
  ON public.feedback_reports
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Admins can manage all feedback" ON public.feedback_reports;
CREATE POLICY "Admins can manage all feedback"
  ON public.feedback_reports
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can view comments on their feedback" ON public.feedback_comments;
CREATE POLICY "Users can view comments on their feedback"
  ON public.feedback_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.feedback_reports
      WHERE id = feedback_comments.feedback_id
      AND (created_by = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

DROP POLICY IF EXISTS "Users can create comments on feedback" ON public.feedback_comments;
CREATE POLICY "Users can create comments on feedback"
  ON public.feedback_comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_feedback_reports_created_by ON public.feedback_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_feedback_reports_status ON public.feedback_reports(status);
CREATE INDEX IF NOT EXISTS idx_feedback_reports_type ON public.feedback_reports(type);
CREATE INDEX IF NOT EXISTS idx_feedback_comments_feedback_id ON public.feedback_comments(feedback_id);

CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_feedback_reports_updated_at ON public.feedback_reports;
CREATE TRIGGER update_feedback_reports_updated_at
  BEFORE UPDATE ON public.feedback_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_updated_at();

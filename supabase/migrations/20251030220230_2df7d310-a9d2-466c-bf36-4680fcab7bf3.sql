
-- Create feedback storage bucket for file attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback', 'feedback', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for feedback bucket
CREATE POLICY "Users can upload their own feedback attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'feedback' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view their own feedback attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'feedback' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Admins can view all feedback attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'feedback' AND
  (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Admins can delete feedback attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'feedback' AND
  (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'))
);

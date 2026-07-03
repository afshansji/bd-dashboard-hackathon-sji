-- Job lead workspace: shared notes, tasks, activities, and file attachments per lead.

CREATE TABLE IF NOT EXISTS public.job_lead_workspaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.upwork_jobs(id) ON DELETE CASCADE,
  assigned_to_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to_name TEXT,
  assigned_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN (
      'new', 'reviewing', 'assigned', 'contacted',
      'meeting_booked', 'won', 'lost', 'archived'
    )),
  due_at TIMESTAMPTZ,
  notes TEXT NOT NULL DEFAULT '',
  proposal_draft TEXT NOT NULL DEFAULT '',
  reply_generated_at TIMESTAMPTZ,
  email_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT job_lead_workspaces_job_unique UNIQUE (job_id)
);

CREATE INDEX IF NOT EXISTS idx_job_lead_workspaces_job_id
  ON public.job_lead_workspaces(job_id);

CREATE INDEX IF NOT EXISTS idx_job_lead_workspaces_assigned_to_id
  ON public.job_lead_workspaces(assigned_to_id);

CREATE TABLE IF NOT EXISTS public.job_lead_workspace_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.job_lead_workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  assigned_to_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_lead_workspace_tasks_workspace_id
  ON public.job_lead_workspace_tasks(workspace_id);

CREATE INDEX IF NOT EXISTS idx_job_lead_workspace_tasks_assigned_to_id
  ON public.job_lead_workspace_tasks(assigned_to_id);

CREATE TABLE IF NOT EXISTS public.job_lead_workspace_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.job_lead_workspaces(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_lead_workspace_activities_workspace_id
  ON public.job_lead_workspace_activities(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.job_lead_workspace_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.upwork_jobs(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_lead_workspace_attachments_job_id
  ON public.job_lead_workspace_attachments(job_id, created_at DESC);

ALTER TABLE public.job_lead_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_lead_workspace_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_lead_workspace_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_lead_workspace_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view job lead workspaces"
  ON public.job_lead_workspaces FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert job lead workspaces"
  ON public.job_lead_workspaces FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update job lead workspaces"
  ON public.job_lead_workspaces FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view job lead workspace tasks"
  ON public.job_lead_workspace_tasks FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert job lead workspace tasks"
  ON public.job_lead_workspace_tasks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update job lead workspace tasks"
  ON public.job_lead_workspace_tasks FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete job lead workspace tasks"
  ON public.job_lead_workspace_tasks FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view job lead workspace activities"
  ON public.job_lead_workspace_activities FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert job lead workspace activities"
  ON public.job_lead_workspace_activities FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view job lead workspace attachments"
  ON public.job_lead_workspace_attachments FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert job lead workspace attachments"
  ON public.job_lead_workspace_attachments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND uploaded_by = auth.uid());

CREATE POLICY "Authenticated users can delete job lead workspace attachments"
  ON public.job_lead_workspace_attachments FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_job_lead_workspaces_updated_at
  BEFORE UPDATE ON public.job_lead_workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_job_lead_workspace_tasks_updated_at
  BEFORE UPDATE ON public.job_lead_workspace_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT
  'job-lead-attachments',
  'job-lead-attachments',
  false,
  26214400,
  ARRAY[
    'application/pdf',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/csv',
    'text/plain'
  ]::text[]
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'job-lead-attachments'
);

CREATE POLICY "Authenticated users can upload job lead attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'job-lead-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view job lead attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'job-lead-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete job lead attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'job-lead-attachments' AND auth.uid() IS NOT NULL);

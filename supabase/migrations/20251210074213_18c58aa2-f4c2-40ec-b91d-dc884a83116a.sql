
-- Create signing_document_recipients table
CREATE TABLE IF NOT EXISTS public.signing_document_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.signing_documents(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL DEFAULT 'signer',
  signing_order INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  signed_at TIMESTAMP WITH TIME ZONE,
  declined_at TIMESTAMP WITH TIME ZONE,
  decline_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create signing_document_watchers table
CREATE TABLE IF NOT EXISTS public.signing_document_watchers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.signing_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'other',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create signing_document_activity_log table
CREATE TABLE IF NOT EXISTS public.signing_document_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.signing_documents(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_type TEXT NOT NULL DEFAULT 'user',
  actor_id TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add missing columns to signing_documents if they don't exist
ALTER TABLE public.signing_documents 
ADD COLUMN IF NOT EXISTS template_id TEXT,
ADD COLUMN IF NOT EXISTS project_id UUID,
ADD COLUMN IF NOT EXISTS pandadoc_doc_id TEXT,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS merge_fields JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Enable RLS on new tables
ALTER TABLE public.signing_document_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signing_document_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signing_document_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for signing_document_recipients
CREATE POLICY "Authenticated users can view recipients" 
ON public.signing_document_recipients 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Document creators can manage recipients" 
ON public.signing_document_recipients 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.signing_documents sd 
  WHERE sd.id = document_id 
  AND (sd.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
));

-- RLS policies for signing_document_watchers
CREATE POLICY "Authenticated users can view watchers" 
ON public.signing_document_watchers 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Document creators can manage watchers" 
ON public.signing_document_watchers 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.signing_documents sd 
  WHERE sd.id = document_id 
  AND (sd.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
));

-- RLS policies for signing_document_activity_log
CREATE POLICY "Authenticated users can view activity" 
ON public.signing_document_activity_log 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert activity" 
ON public.signing_document_activity_log 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_recipients_document_id ON public.signing_document_recipients(document_id);
CREATE INDEX IF NOT EXISTS idx_watchers_document_id ON public.signing_document_watchers(document_id);
CREATE INDEX IF NOT EXISTS idx_activity_document_id ON public.signing_document_activity_log(document_id);

-- Create signing_documents table for document signing functionality
CREATE TABLE public.signing_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id uuid REFERENCES public.deals(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  document_type text NOT NULL DEFAULT 'contract',
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  file_url text,
  signed_file_url text,
  sent_at timestamp with time zone,
  viewed_at timestamp with time zone,
  completed_at timestamp with time zone,
  declined_at timestamp with time zone,
  expired_at timestamp with time zone,
  signer_email text,
  signer_name text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.signing_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view signing documents"
ON public.signing_documents FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can manage signing documents"
ON public.signing_documents FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Update trigger
CREATE TRIGGER update_signing_documents_updated_at
BEFORE UPDATE ON public.signing_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
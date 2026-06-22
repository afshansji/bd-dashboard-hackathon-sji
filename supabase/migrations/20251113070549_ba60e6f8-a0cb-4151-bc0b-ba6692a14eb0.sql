-- Phase 1: PandaDoc Integration Database Schema

-- Create proposal_documents table
CREATE TABLE IF NOT EXISTS public.proposal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- PandaDoc Integration
  pandadoc_doc_id TEXT UNIQUE,
  pandadoc_session_id TEXT,
  
  -- Document Details
  title TEXT NOT NULL,
  template_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  
  -- URLs
  pdf_url TEXT,
  editor_url TEXT,
  recipient_url TEXT,
  
  -- Metadata
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- Additional Data
  metadata JSONB DEFAULT '{}',
  
  CONSTRAINT proposal_status_check CHECK (status IN (
    'draft', 'sent', 'viewed', 'completed', 'signed', 'declined', 'expired'
  ))
);

-- Indexes for proposal_documents
CREATE INDEX idx_proposal_documents_deal ON public.proposal_documents(deal_id);
CREATE INDEX idx_proposal_documents_client ON public.proposal_documents(client_id);
CREATE INDEX idx_proposal_documents_pandadoc ON public.proposal_documents(pandadoc_doc_id);
CREATE INDEX idx_proposal_documents_status ON public.proposal_documents(status);
CREATE INDEX idx_proposal_documents_created_by ON public.proposal_documents(created_by);

-- Auto-update timestamp trigger for proposal_documents
CREATE TRIGGER update_proposal_documents_updated_at
  BEFORE UPDATE ON public.proposal_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create pandadoc_integrations table
CREATE TABLE IF NOT EXISTS public.pandadoc_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Encrypted credentials
  api_key_encrypted TEXT NOT NULL,
  
  -- Configuration
  workspace_id TEXT,
  default_template_id TEXT,
  
  -- Settings
  is_active BOOLEAN DEFAULT true,
  auto_send_enabled BOOLEAN DEFAULT false,
  embed_enabled BOOLEAN DEFAULT true,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  last_synced_at TIMESTAMPTZ,
  
  -- Metadata
  config JSONB DEFAULT '{}'::jsonb
);

-- Indexes for pandadoc_integrations
CREATE INDEX idx_pandadoc_integrations_user ON public.pandadoc_integrations(user_id);
CREATE INDEX idx_pandadoc_integrations_active ON public.pandadoc_integrations(is_active);

-- Auto-update timestamp trigger for pandadoc_integrations
CREATE TRIGGER update_pandadoc_integrations_updated_at
  BEFORE UPDATE ON public.pandadoc_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.proposal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pandadoc_integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for proposal_documents
CREATE POLICY "Users can view proposals they created or own"
  ON public.proposal_documents FOR SELECT
  USING (
    created_by = auth.uid() 
    OR has_role(auth.uid(), 'super_admin') 
    OR has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.deals d 
      WHERE d.id = proposal_documents.deal_id 
      AND d.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create proposals"
  ON public.proposal_documents FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own proposals"
  ON public.proposal_documents FOR UPDATE
  USING (
    created_by = auth.uid() 
    OR has_role(auth.uid(), 'super_admin') 
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete proposals"
  ON public.proposal_documents FOR DELETE
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for pandadoc_integrations
CREATE POLICY "Users can view own integrations"
  ON public.pandadoc_integrations FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create own integrations"
  ON public.pandadoc_integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own integrations"
  ON public.pandadoc_integrations FOR UPDATE
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete integrations"
  ON public.pandadoc_integrations FOR DELETE
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));
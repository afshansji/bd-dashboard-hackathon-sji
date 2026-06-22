-- Migration: Add Signing Documents for SOW/NDA with E-Signature
-- Created: 2025-01-04

-- ============================================================================
-- SIGNING DOCUMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS signing_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Document Info
  document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('sow', 'nda')),
  title VARCHAR(255) NOT NULL,
  template_id VARCHAR(100) NOT NULL,

  -- Relationships
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  project_id UUID,
  created_by UUID NOT NULL,

  -- PandaDoc Integration
  pandadoc_doc_id VARCHAR(100),
  pandadoc_session_id VARCHAR(100),

  -- Status Tracking
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'viewed', 'completed', 'declined', 'expired', 'voided')),

  -- Timestamps
  sent_at TIMESTAMPTZ,
  first_viewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- File Storage
  pdf_url TEXT,
  certificate_url TEXT,

  -- Metadata
  merge_fields JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for signing_documents
CREATE INDEX IF NOT EXISTS idx_signing_documents_deal_id ON signing_documents(deal_id);
CREATE INDEX IF NOT EXISTS idx_signing_documents_client_id ON signing_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_signing_documents_status ON signing_documents(status);
CREATE INDEX IF NOT EXISTS idx_signing_documents_created_by ON signing_documents(created_by);
CREATE INDEX IF NOT EXISTS idx_signing_documents_pandadoc_doc_id ON signing_documents(pandadoc_doc_id);
CREATE INDEX IF NOT EXISTS idx_signing_documents_document_type ON signing_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_signing_documents_created_at ON signing_documents(created_at DESC);

-- ============================================================================
-- SIGNING DOCUMENT RECIPIENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS signing_document_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES signing_documents(id) ON DELETE CASCADE NOT NULL,

  -- Recipient Info
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) NOT NULL CHECK (role IN ('signer', 'approver', 'cc')),
  signing_order INTEGER NOT NULL DEFAULT 1,

  -- Status
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'viewed', 'signed', 'declined')),
  signed_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  decline_reason TEXT,

  -- PandaDoc
  pandadoc_recipient_id VARCHAR(100),

  -- Metadata
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for signing_document_recipients
CREATE INDEX IF NOT EXISTS idx_signing_recipients_document_id ON signing_document_recipients(document_id);
CREATE INDEX IF NOT EXISTS idx_signing_recipients_email ON signing_document_recipients(email);
CREATE INDEX IF NOT EXISTS idx_signing_recipients_signing_order ON signing_document_recipients(document_id, signing_order);
CREATE INDEX IF NOT EXISTS idx_signing_recipients_status ON signing_document_recipients(status);

-- ============================================================================
-- SIGNING DOCUMENT ACTIVITY LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS signing_document_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES signing_documents(id) ON DELETE CASCADE NOT NULL,

  -- Activity Info
  action VARCHAR(50) NOT NULL,
  -- Actions: 'created', 'sent', 'viewed', 'signed', 'declined',
  --          'expired', 'voided', 'resent', 'downloaded', 'reminder_sent',
  --          'recipient_added', 'recipient_removed', 'watcher_added', 'watcher_removed'

  actor_type VARCHAR(20) NOT NULL CHECK (actor_type IN ('user', 'recipient', 'system', 'webhook')),
  actor_id UUID,
  actor_email VARCHAR(255),

  -- Details
  description TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address INET,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for activity log
CREATE INDEX IF NOT EXISTS idx_activity_log_document_id ON signing_document_activity_log(document_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON signing_document_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON signing_document_activity_log(action);

-- ============================================================================
-- SIGNING DOCUMENT WATCHERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS signing_document_watchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES signing_documents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  role VARCHAR(50) NOT NULL, -- 'finance', 'legal', 'manager', 'other'

  -- Notification Preferences
  notify_on_sent BOOLEAN DEFAULT true,
  notify_on_viewed BOOLEAN DEFAULT true,
  notify_on_signed BOOLEAN DEFAULT true,
  notify_on_declined BOOLEAN DEFAULT true,
  notify_on_expired BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(document_id, user_id)
);

-- Indexes for watchers
CREATE INDEX IF NOT EXISTS idx_signing_watchers_document_id ON signing_document_watchers(document_id);
CREATE INDEX IF NOT EXISTS idx_signing_watchers_user_id ON signing_document_watchers(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE signing_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE signing_document_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE signing_document_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE signing_document_watchers ENABLE ROW LEVEL SECURITY;

-- Signing Documents Policies
CREATE POLICY "signing_documents_select_policy" ON signing_documents
  FOR SELECT USING (
    created_by = auth.uid()
    OR id IN (SELECT document_id FROM signing_document_watchers WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin', 'manager')
    )
  );

CREATE POLICY "signing_documents_insert_policy" ON signing_documents
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "signing_documents_update_policy" ON signing_documents
  FOR UPDATE USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "signing_documents_delete_policy" ON signing_documents
  FOR DELETE USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Recipients Policies (inherit from document access)
CREATE POLICY "signing_recipients_select_policy" ON signing_document_recipients
  FOR SELECT USING (
    document_id IN (
      SELECT id FROM signing_documents
      WHERE created_by = auth.uid()
      OR id IN (SELECT document_id FROM signing_document_watchers WHERE user_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'manager')
      )
    )
  );

CREATE POLICY "signing_recipients_insert_policy" ON signing_document_recipients
  FOR INSERT WITH CHECK (
    document_id IN (SELECT id FROM signing_documents WHERE created_by = auth.uid())
  );

CREATE POLICY "signing_recipients_update_policy" ON signing_document_recipients
  FOR UPDATE USING (
    document_id IN (SELECT id FROM signing_documents WHERE created_by = auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "signing_recipients_delete_policy" ON signing_document_recipients
  FOR DELETE USING (
    document_id IN (SELECT id FROM signing_documents WHERE created_by = auth.uid())
  );

-- Activity Log Policies
CREATE POLICY "activity_log_select_policy" ON signing_document_activity_log
  FOR SELECT USING (
    document_id IN (
      SELECT id FROM signing_documents
      WHERE created_by = auth.uid()
      OR id IN (SELECT document_id FROM signing_document_watchers WHERE user_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'manager')
      )
    )
  );

-- Allow insert for service role (webhooks/edge functions)
CREATE POLICY "activity_log_insert_policy" ON signing_document_activity_log
  FOR INSERT WITH CHECK (true);

-- Watchers Policies
CREATE POLICY "watchers_select_policy" ON signing_document_watchers
  FOR SELECT USING (
    user_id = auth.uid()
    OR document_id IN (SELECT id FROM signing_documents WHERE created_by = auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin', 'manager')
    )
  );

CREATE POLICY "watchers_insert_policy" ON signing_document_watchers
  FOR INSERT WITH CHECK (
    document_id IN (SELECT id FROM signing_documents WHERE created_by = auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "watchers_delete_policy" ON signing_document_watchers
  FOR DELETE USING (
    user_id = auth.uid()
    OR document_id IN (SELECT id FROM signing_documents WHERE created_by = auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_signing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_signing_documents_updated_at
  BEFORE UPDATE ON signing_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_signing_updated_at();

CREATE TRIGGER trigger_signing_recipients_updated_at
  BEFORE UPDATE ON signing_document_recipients
  FOR EACH ROW
  EXECUTE FUNCTION update_signing_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE signing_documents IS 'SOW and NDA documents for e-signature';
COMMENT ON TABLE signing_document_recipients IS 'Recipients/signers for signing documents with ordering';
COMMENT ON TABLE signing_document_activity_log IS 'Audit trail for all signing document events';
COMMENT ON TABLE signing_document_watchers IS 'Users watching document progress (Finance, Legal, etc.)';

COMMENT ON COLUMN signing_documents.document_type IS 'Type of document: sow (Statement of Work) or nda (Non-Disclosure Agreement)';
COMMENT ON COLUMN signing_documents.status IS 'Current document status in the signing workflow';
COMMENT ON COLUMN signing_document_recipients.signing_order IS 'Order in which recipients sign (1 = first, 2 = second, etc.)';
COMMENT ON COLUMN signing_document_recipients.role IS 'Recipient role: signer (must sign), approver (must approve), cc (view only)';

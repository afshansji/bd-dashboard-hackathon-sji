// Types for SOW/NDA Signing Documents with E-Signature

export type DocumentType = 'sow' | 'nda';

export type SigningDocumentStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'completed'
  | 'declined'
  | 'expired'
  | 'voided';

export type RecipientRole = 'signer' | 'approver' | 'cc';

export type RecipientStatus = 'pending' | 'sent' | 'viewed' | 'signed' | 'declined';

export type ActivityAction =
  | 'created'
  | 'sent'
  | 'viewed'
  | 'signed'
  | 'declined'
  | 'expired'
  | 'voided'
  | 'resent'
  | 'downloaded'
  | 'reminder_sent'
  | 'recipient_added'
  | 'recipient_removed'
  | 'watcher_added'
  | 'watcher_removed';

export type ActorType = 'user' | 'recipient' | 'system' | 'webhook';

export type WatcherRole = 'finance' | 'legal' | 'manager' | 'other';

// ============================================================================
// MAIN ENTITIES
// ============================================================================

export interface SigningDocument {
  id: string;
  document_type: DocumentType;
  title: string;
  template_id: string;
  deal_id?: string;
  client_id?: string;
  project_id?: string;
  created_by: string;
  pandadoc_doc_id?: string;
  pandadoc_session_id?: string;
  status: SigningDocumentStatus;
  sent_at?: string;
  first_viewed_at?: string;
  completed_at?: string;
  declined_at?: string;
  voided_at?: string;
  expires_at?: string;
  pdf_url?: string;
  certificate_url?: string;
  merge_fields: Record<string, any>;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;

  // Relations (populated on fetch)
  deal?: { id: string; title: string };
  client?: { id: string; name: string; email?: string; company?: string };
  project?: { id: string; name: string };
  creator?: { id: string; full_name: string; email: string };
  signing_document_recipients?: SigningRecipient[];
  signing_document_watchers?: SigningWatcher[];
}

export interface SigningRecipient {
  id: string;
  document_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: RecipientRole;
  signing_order: number;
  status: RecipientStatus;
  signed_at?: string;
  viewed_at?: string;
  declined_at?: string;
  decline_reason?: string;
  pandadoc_recipient_id?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  updated_at: string;
}

export interface SigningWatcher {
  id: string;
  document_id: string;
  user_id: string;
  role: WatcherRole;
  notify_on_sent: boolean;
  notify_on_viewed: boolean;
  notify_on_signed: boolean;
  notify_on_declined: boolean;
  notify_on_expired: boolean;
  created_at: string;

  // Populated on fetch
  user?: { id: string; full_name: string; email: string };
}

export interface SigningActivityLog {
  id: string;
  document_id: string;
  action: ActivityAction;
  actor_type: ActorType;
  actor_id?: string;
  actor_email?: string;
  description?: string;
  metadata: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateSigningDocumentRequest {
  documentType: DocumentType;
  templateId: string;
  title: string;
  dealId?: string;
  clientId?: string;
  projectId?: string;
  recipients: CreateRecipientRequest[];
  mergeFields?: Record<string, any>;
  expiresInDays?: number;
  watchers?: CreateWatcherRequest[];
}

export interface CreateRecipientRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: RecipientRole;
  signingOrder: number;
}

export interface CreateWatcherRequest {
  userId: string;
  role: WatcherRole;
  notifyOnSent?: boolean;
  notifyOnViewed?: boolean;
  notifyOnSigned?: boolean;
  notifyOnDeclined?: boolean;
  notifyOnExpired?: boolean;
}

export interface SendDocumentRequest {
  message?: string;
  subject?: string;
}

export interface VoidDocumentRequest {
  reason?: string;
}

export interface EmbedSessionRequest {
  recipientEmail: string;
}

export interface EmbedSessionResponse {
  ok: boolean;
  sessionUrl?: string;
  expiresAt?: string;
  error?: string;
}

export interface SigningDocumentResponse {
  ok: boolean;
  document?: SigningDocument;
  error?: string;
}

export interface SigningDocumentsListResponse {
  ok: boolean;
  documents?: SigningDocument[];
  total?: number;
  error?: string;
}

// ============================================================================
// FILTER/QUERY TYPES
// ============================================================================

export interface SigningDocumentFilters {
  dealId?: string;
  clientId?: string;
  projectId?: string;
  status?: SigningDocumentStatus;
  documentType?: DocumentType;
  createdBy?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface SigningDocumentSort {
  field: 'created_at' | 'updated_at' | 'title' | 'status' | 'expires_at';
  direction: 'asc' | 'desc';
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface RecipientFormData {
  id: string; // Temporary ID for UI
  email: string;
  firstName: string;
  lastName: string;
  role: RecipientRole;
  signingOrder: number;
}

export interface WatcherFormData {
  userId: string;
  role: WatcherRole;
  userName?: string;
  userEmail?: string;
}

export interface SigningDocumentFormState {
  step: 'template' | 'recipients' | 'preview';
  documentType: DocumentType;
  templateId: string;
  templateName?: string;
  title: string;
  dealId?: string;
  clientId?: string;
  projectId?: string;
  recipients: RecipientFormData[];
  watchers: WatcherFormData[];
  mergeFields: Record<string, string>;
  expiresInDays: number;
}

// ============================================================================
// TEMPLATE TYPES
// ============================================================================

export interface SigningTemplate {
  id: string;
  name: string;
  document_type: DocumentType;
  date_created: string;
  date_modified: string;
  description?: string;
  // From PandaDoc
  pandadoc_template_id?: string;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface SigningDocumentStats {
  total: number;
  byStatus: Record<SigningDocumentStatus, number>;
  byType: Record<DocumentType, number>;
  avgTimeToSign: number; // in hours
  completionRate: number; // percentage
  recentActivity: SigningActivityLog[];
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface SigningNotificationPayload {
  documentId: string;
  documentTitle: string;
  documentType: DocumentType;
  eventType: 'sent' | 'viewed' | 'signed' | 'declined' | 'expired' | 'completed';
  recipientEmail?: string;
  recipientName?: string;
  signerEmail?: string;
  signerName?: string;
  declineReason?: string;
}

// ============================================================================
// WEBHOOK TYPES
// ============================================================================

export interface PandaDocWebhookEvent {
  event: string;
  data: {
    id: string;
    name?: string;
    status?: string;
    date_created?: string;
    date_modified?: string;
    date_completed?: string;
    recipients?: Array<{
      email: string;
      first_name?: string;
      last_name?: string;
      role?: string;
      signing_order?: number;
      has_completed?: boolean;
      completed_on?: string;
    }>;
    metadata?: Record<string, any>;
  };
}

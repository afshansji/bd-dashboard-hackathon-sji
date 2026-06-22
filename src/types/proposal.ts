export interface ProposalDocument {
  id: string;
  deal_id: string;
  client_id: string;
  created_by: string;
  pandadoc_doc_id: string;
  pandadoc_session_id?: string;
  title: string;
  template_id: string;
  status: ProposalStatus;
  pdf_url?: string;
  editor_url?: string;
  recipient_url?: string;
  sent_at?: string;
  viewed_at?: string;
  completed_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  metadata?: {
    recipients?: any[];
    tokens?: any[];
  };
  
  // Relations
  deal?: {
    id: string;
    title: string;
  };
  client?: {
    id: string;
    name: string;
  };
}

export type ProposalStatus = 
  | 'draft' 
  | 'sent' 
  | 'viewed' 
  | 'completed' 
  | 'signed' 
  | 'declined' 
  | 'expired';

export interface PandaDocTemplate {
  id: string;
  name: string;
  date_created: string;
  date_modified: string;
}

export interface PandaDocIntegration {
  id: string;
  workspace_id?: string;
  default_template_id?: string;
  is_active: boolean;
  auto_send_enabled: boolean;
  embed_enabled: boolean;
  created_at: string;
  last_synced_at?: string;
}

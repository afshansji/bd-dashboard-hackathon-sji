export interface ControlTowerLead {
  id: string;
  name: string;
  company: string;
  email?: string;
  phone?: string;
  source: 'linkedin' | 'referral' | 'bidding' | 'website' | 'other';
  status: 'cold' | 'warm' | 'hot';
  owner_id?: string;
  owner_name?: string;
  created_at: string;
  updated_at: string;
  notes?: string;

  // Extended contact details
  contact_first_name?: string;
  contact_last_name?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_title?: string;
  contact_person?: string;

  // Extended company details
  company_name?: string;
  company_website?: string;
  company_industry?: string;
  company_address?: string;
  company_city?: string;
  company_state?: string;
  company_country?: string;

  // Social links
  linkedin_url?: string;

  // Client reference (if associated with a client)
  client_id?: string;
  client?: {
    id: string;
    name?: string;
    company?: string;
    email?: string;
    phone?: string;
    contact_person?: string;
    website?: string;
    industry?: string;
    address?: string;
  };
}

export interface ControlTowerWarmLead {
  id: string;
  contact_name: string;
  company: string;
  email: string;
  hubspot_id?: string;
  hubspot_url?: string;
  source: string;
  last_touch?: string;
  next_step?: string;
  owner_id?: string;
  owner_name?: string;
  created_at: string;
  updated_at: string;

  // Extended contact details
  contact_first_name?: string;
  contact_last_name?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_title?: string;
  contact_person?: string;

  // Extended company details
  company_name?: string;
  company_website?: string;
  company_industry?: string;
  company_address?: string;
  company_city?: string;
  company_state?: string;
  company_country?: string;

  // HubSpot specific fields
  hubspot_contact_id?: string;
  hubspot_owner_id?: string;
  linkedin_url?: string;
  lead_status?: string;
  lead_score?: number;

  // Client reference (if associated with a client)
  client_id?: string;
  client?: {
    id: string;
    name?: string;
    company?: string;
    email?: string;
    phone?: string;
    contact_person?: string;
    website?: string;
    industry?: string;
    address?: string;
  };
}

export interface ControlTowerDeal {
  id: string;
  deal_name: string;
  client_id?: string;
  client_name?: string;
  stage: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  value?: number;
  owner_id?: string;
  owner_name?: string;
  pm_assigned_id?: string;
  pm_assigned_name?: string;
  status: 'active' | 'won' | 'lost' | 'on_hold';
  close_date?: string;
  created_at: string;
  updated_at: string;
  project_id?: string;
}

export interface ControlTowerClient {
  id: string;
  name: string;
  company: string;
  industry?: string;
  owner_id?: string;
  owner_name?: string;
  active_projects_count: number;
  total_revenue?: number;
  status: 'active' | 'inactive' | 'churned';
  created_at: string;
  updated_at: string;
}

export interface ControlTowerSummary {
  new_leads_count: number;
  warm_leads_count: number;
  active_deals_count: number;
  deals_value_total: number;
  active_clients_count: number;
}

export interface ControlTowerDealEnhanced extends ControlTowerDeal {
  // Client contact info from clients table
  client_email?: string;
  client_phone?: string;
  client_contact_person?: string;
  client_address?: any; // JSONB
  client_industry?: string;
  client_domain?: string;
  
  // Additional deal fields from Control Tower
  hubspot_deal_id?: string;
  hubspot_crm_deal_url?: string;
  dealtype?: string;
  lead_source?: string;
  expected_closing_date?: string;
  potential_amount?: number;
  
  // Pipeline and work type
  pipeline?: string;
  type_of_work?: string;
  
  // Estimate URLs
  estimate_url?: string;
  internal_estimate_doc_url?: string;
  client_estimate_doc_url?: string;
  estimate_task_link?: string;
  internal_estimate_doc_link?: string;
  client_call_recording_link?: string;
  
  // Proposal and collaboration URLs
  pandadoc_proposal_url?: string;
  collaborative_ai?: string;
  collaborative_ai_link?: string;
  workboard_ai_link?: string;
  
  // CRM URLs
  leadslift_crm_deal_url?: string;
  client_agent_url?: string;
  client_agent_folder?: string;
}

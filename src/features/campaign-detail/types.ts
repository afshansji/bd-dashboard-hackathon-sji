import type { BDCampaign } from "@/hooks/useBDCampaigns";

export type CampaignContactStatus =
  | "identified"
  | "researched"
  | "client_not_ideal"
  | "contacted_linkedin"
  | "contacted_social"
  | "connected"
  | "client_not_responsive"
  | "messaged"
  | "contacted_email"
  | "responded"
  | "meeting_booked"
  | "close_lost"
  | "won";

export interface CampaignContact {
  id: string;
  slug: string;
  campaign_id: string;
  contact_name: string;
  contact_email?: string | null;
  contact_linkedin_url?: string | null;
  contact_company?: string | null;
  contact_title?: string | null;
  contact_phone?: string | null;
  status: CampaignContactStatus;
  linkedin_request_sent_at?: string | null;
  linkedin_accepted_at?: string | null;
  linkedin_message_sent_at?: string | null;
  email_sent_at?: string | null;
  last_activity_at?: string | null;
  research_summary?: Record<string, unknown> | null;
  personalization_notes?: string | null;
  assigned_to?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  
  // LinkedIn enrichment fields
  linkedin_headline?: string | null;
  linkedin_location?: string | null;
  linkedin_follower_count?: number | null;
  linkedin_connection_count?: number | null;
  linkedin_profile_image_url?: string | null;
  current_employer?: string | null;
  current_position_title?: string | null;
  current_position_start_date?: string | null;
  years_in_current_role?: number | null;
  linkedin_about?: string | null;
  linkedin_skills?: string[] | null;
  languages?: string[] | null;
  total_years_experience?: number | null;
  industry_focus?: string | null;
  previous_employers?: string[] | null;
  education_summary?: string | null;
  highest_degree?: string | null;
  profile_completeness_score?: number | null;
  last_linkedin_activity_date?: string | null;
  
  // Company enrichment fields
  company_id?: string | null;
  company_website?: string | null;
  company_linkedin_url?: string | null;
  company_industry?: string | null;
  company_size?: string | null;
  company_description?: string | null;
  company_headquarters?: string | null;
  company_founded_year?: number | null;
  
  // Tags
  tags?: string[] | null;
  tag_colors?: Record<string, string> | null;
}

export interface CampaignActivity {
  id: string;
  campaign_id: string;
  contact_id?: string | null;
  activity_type:
    | "linkedin_request"
    | "linkedin_message"
    | "email_sent"
    | "response_received"
    | "meeting_booked"
    | "task_updated"
    | "ai_summary_created";
  activity_data?: Record<string, unknown> | null;
  performed_by?: string | null;
  performed_at: string;
  ai_generated?: boolean | null;
  created_at: string;
}

export interface CampaignAITask {
  id: string;
  campaign_id: string;
  contact_id?: string | null;
  task_type:
    | "research"
    | "email_generation"
    | "message_generation"
    | "personalization"
    | "summary"
    | "analysis";
  agent_id?: string | null;
  input_data?: Record<string, unknown> | null;
  output_data?: Record<string, unknown> | null;
  status: "pending" | "running" | "completed" | "failed";
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

export interface CampaignKpi {
  id: string;
  label: string;
  target_value?: number | null;
  current_value?: number | null;
  unit?: string | null;
  trend?: number | null;
  updated_at?: string | null;
  source?: string | null;
}

export interface CampaignAnalyticsPoint {
  id: string;
  metric: string;
  value: number;
  recorded_at: string;
  comparison_value?: number | null;
  source?: string | null;
}

export interface CampaignProjectTask {
  id: string;
  name: string;
  status: "todo" | "in_progress" | "blocked" | "complete" | "archived";
  due_date?: string | null;
  completed_at?: string | null;
  assignee?: string | null;
  ai_summary?: string | null;
  last_activity_at?: string | null;
  created_at?: string | null;
}

export interface CampaignAIAgentRun {
  id: string;
  agent_id?: string | null;
  agent_name?: string | null;
  status: "pending" | "running" | "completed" | "failed";
  started_at: string;
  completed_at?: string | null;
  output_summary?: string | null;
}

export type IntegrationStatusValue =
  | "synced"
  | "pending"
  | "error"
  | "not_configured"
  | "disabled";

export interface CampaignIntegrationStatus {
  status: IntegrationStatusValue;
  last_synced_at?: string | null;
  message?: string | null;
}

export interface CampaignDetailIntegrations {
  n8n?: CampaignIntegrationStatus;
  hubspot?: CampaignIntegrationStatus;
  ghl?: CampaignIntegrationStatus;
}

export interface CampaignDetailResponse {
  campaign: BDCampaign & {
    ai_summary?: string | null;
    ai_post_mortem?: string | null;
    insights_summary?: string | null;
  };
  contacts?: CampaignContact[];
  activities?: CampaignActivity[];
  ai_tasks?: CampaignAITask[];
  linked_kpis?: CampaignKpi[];
  analytics_data?: CampaignAnalyticsPoint[];
  project_tasks?: CampaignProjectTask[];
  ai_agent_runs?: CampaignAIAgentRun[];
  integrations?: CampaignDetailIntegrations;
}

export interface UpdateCampaignPayload {
  campaign?: {
    status?: string;
    archived?: boolean;
    name?: string;
    campaign_type?: string;
    campaign_types?: string[];
    brand_id?: string | null;
    brand_ids?: string[];
    niche_id?: string;
    ghl_campaign_id?: string | null;
    linkedin_campaign_id?: string | null;
    ai_agent_id?: string | null;
    content_template?: unknown;
    research_data?: Record<string, unknown> | null;
    linkedin_stats?: Record<string, unknown> | null;
    ghl_stats?: Record<string, unknown> | null;
    contacts_summary?: unknown;
    metadata?: Record<string, unknown> | null;
    start_date?: string | null;
    end_date?: string | null;
    target_contacts?: string[] | null;
    target_regions?: string[] | null;
    target_contacts_count?: number | null;
    actual_contacts_reached?: number | null;
    responses_received?: number | null;
    meetings_booked?: number | null;
    deals_generated?: number | null;
    owned_by?: string | null;
  };
  metrics?: Array<{
    metric_name: string;
    metric_value: number;
    source?: string;
    recorded_at?: string;
    dimensions?: Record<string, unknown>;
  }>;
  options?: {
    seedKpis?: boolean;
    taskTemplateKey?: string;
    tasks?: Array<{
      title: string;
      description?: string | null;
      status?: string;
      priority?: "low" | "medium" | "high";
      dueInDays?: number | null;
      assigned_to?: string | null;
    }>;
  };
}

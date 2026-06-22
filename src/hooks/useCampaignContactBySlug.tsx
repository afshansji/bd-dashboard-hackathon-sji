import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  status: string;
  research_summary?: unknown;
  metadata?: unknown;
  last_enriched_at?: string | null;
  created_at: string;
  updated_at: string;
  
  // New LinkedIn fields
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
}

export const useCampaignContactBySlug = (slug: string | undefined) => {
  return useQuery({
    queryKey: ["campaign-contact-by-slug", slug],
    queryFn: async () => {
      if (!slug) throw new Error("Slug is required");
      
      const { data, error } = await supabase
        .from("campaign_contacts")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Contact not found");
      return data as CampaignContact;
    },
    enabled: !!slug,
  });
};

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GenerateMessageParams {
  contactId: string;
  messageType: 'connection_request' | 'first_followup' | 'second_followup' | 'meeting_request';
  userContext?: string;
}

interface MessageVariant {
  variant_name: string;
  message: string;
  character_count: number;
  tone: string;
  key_hooks: string[];
  personalization_elements: string[];
}

interface GeneratedMessageResponse {
  message_variants: MessageVariant[];
  recommended_variant: string;
  reasoning: string;
  send_timing_suggestion: string;
  follow_up_strategy: string;
}

export function useGenerateLinkedInMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: GenerateMessageParams) => {
      // Fetch contact WITH campaign data
      const { data: contact, error: contactError } = await supabase
        .from('campaign_contacts')
        .select(`
          *,
          bd_campaigns!inner(
            id, name, campaign_type, status,
            target_contacts, target_regions
          )
        `)
        .eq('id', params.contactId)
        .single();

      if (contactError || !contact) throw new Error('Contact not found');

      // Find the LinkedIn agent
      const { data: agent, error: agentError } = await supabase
        .from('ai_agents')
        .select('id')
        .eq('slug', 'linkedin-message-generator')
        .eq('is_active', true)
        .single();

      if (agentError || !agent) {
        throw new Error('LinkedIn message agent not configured');
      }

      // Prepare execution context with contact + campaign + company data
      const executionContext = {
        user_id: contact.id,
        message_type: params.messageType,
        contact_data: {
          contact_name: contact.contact_name,
          current_position_title: contact.current_position_title,
          current_employer: contact.current_employer,
          linkedin_headline: contact.linkedin_headline,
          linkedin_location: contact.linkedin_location,
          years_in_current_role: contact.years_in_current_role,
          total_years_experience: contact.total_years_experience,
          industry_focus: contact.industry_focus,
          linkedin_skills: contact.linkedin_skills,
          linkedin_about: contact.linkedin_about,
          education_summary: contact.education_summary,
          previous_employers: contact.previous_employers,
          research_summary: contact.research_summary,
          status: contact.status,
        },
        campaign_context: {
          campaign_name: (contact.bd_campaigns as any).name,
          campaign_type: (contact.bd_campaigns as any).campaign_type,
          campaign_status: (contact.bd_campaigns as any).status,
          target_contacts: (contact.bd_campaigns as any).target_contacts,
          target_regions: (contact.bd_campaigns as any).target_regions,
        },
        company_context: {
          company_name: contact.contact_company,
          company_website: contact.company_website,
          company_linkedin: contact.company_linkedin_url,
          company_industry: contact.company_industry,
          company_size: contact.company_size,
          company_headquarters: contact.company_headquarters,
          company_description: contact.company_description,
          company_founded_year: contact.company_founded_year,
        },
        user_context: params.userContext || ''
      };

      // Call run-ai-agent edge function
      const { data, error } = await supabase.functions.invoke('run-ai-agent', {
        body: {
          agent_id: agent.id,
          execution_context: executionContext,
        },
      });

      if (error) throw error;
      const result = data.structured_output as GeneratedMessageResponse;

      // Save to database
      const { data: userData } = await supabase.auth.getUser();
      const { error: saveError } = await supabase
        .from('campaign_contact_linkedin_messages')
        .insert([{
          contact_id: params.contactId,
          campaign_id: (contact.bd_campaigns as any).id,
          message_type: params.messageType,
          user_context: params.userContext || null,
          message_variants: result.message_variants as any,
          recommended_variant: result.recommended_variant,
          reasoning: result.reasoning || null,
          send_timing_suggestion: result.send_timing_suggestion || null,
          follow_up_strategy: result.follow_up_strategy || null,
          generation_context: executionContext as any,
          generated_by: userData.user?.id || null,
        }]);

      if (saveError) {
        console.error('Failed to save message:', saveError);
      }

      return result;
    },
    onSuccess: (data, variables) => {
      // Validate character counts
      const messageType = variables.messageType;
      const maxChars = messageType === 'connection_request' ? 200 : 500;
      
      const overLimitVariants = data.message_variants.filter(v => v.character_count > maxChars);
      
      if (overLimitVariants.length > 0) {
        toast.warning("Some message variants exceed the LinkedIn limit", {
          description: `${overLimitVariants.length} variant(s) are over ${maxChars} characters. Consider regenerating with more specific constraints.`,
        });
      } else {
        toast.success("LinkedIn messages generated & saved", {
          description: `All variants are within the ${maxChars} character limit`,
        });
      }
      
      queryClient.invalidateQueries({ 
        queryKey: ['linkedin-message-history', variables.contactId] 
      });
    },
    onError: (error: Error) => {
      console.error('Message generation failed:', error);
      toast.error("Failed to generate messages", {
        description: error.message,
      });
    },
  });
}

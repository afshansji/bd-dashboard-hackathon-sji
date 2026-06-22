import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SequenceStep {
  type: 'connection_request' | 'first_followup' | 'second_followup' | 'meeting_request';
  delay_days: number;
}

interface GenerateSequenceParams {
  contactId: string;
  steps: SequenceStep[];
  userContext?: string;
}

interface SequenceMessageVariant {
  variant_name: string;
  message: string;
  character_count: number;
  tone: string;
  key_hooks: string[];
  personalization_elements: string[];
}

interface SequenceStepResult {
  step_order: number;
  message_type: string;
  delay_days: number;
  message_variants: SequenceMessageVariant[];
  recommended_variant: string;
  reasoning: string;
  send_timing_suggestion: string;
}

interface GeneratedSequenceResponse {
  sequence_id: string;
  steps: SequenceStepResult[];
  overall_strategy: string;
}

export function useGenerateLinkedInSequence() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: GenerateSequenceParams): Promise<GeneratedSequenceResponse> => {
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

      // Generate a sequence ID
      const sequenceId = crypto.randomUUID();

      // Generate each step sequentially with context from previous steps
      const generatedSteps: SequenceStepResult[] = [];

      for (let i = 0; i < params.steps.length; i++) {
        const step = params.steps[i];
        
        // Build context including previous steps
        const previousStepsContext = generatedSteps.length > 0 
          ? `Previous messages in sequence:\n${generatedSteps.map((s, idx) => 
              `Step ${idx + 1} (${s.message_type}): "${s.message_variants[0]?.message || 'N/A'}"`
            ).join('\n')}`
          : '';

        const executionContext = {
          user_id: contact.id,
          message_type: step.type,
          is_sequence_generation: true,
          sequence_step: i + 1,
          total_steps: params.steps.length,
          previous_steps_context: previousStepsContext,
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
        const result = data.structured_output;

        // Save to database with sequence info
        const { data: userData } = await supabase.auth.getUser();
        await supabase
          .from('campaign_contact_linkedin_messages')
          .insert([{
            contact_id: params.contactId,
            campaign_id: (contact.bd_campaigns as any).id,
            message_type: step.type,
            user_context: params.userContext || null,
            message_variants: result.message_variants,
            recommended_variant: result.recommended_variant,
            reasoning: result.reasoning || null,
            send_timing_suggestion: result.send_timing_suggestion || null,
            follow_up_strategy: result.follow_up_strategy || null,
            generation_context: executionContext,
            generated_by: userData.user?.id || null,
            sequence_id: sequenceId,
            sequence_step_order: i + 1,
          }]);

        generatedSteps.push({
          step_order: i + 1,
          message_type: step.type,
          delay_days: step.delay_days,
          message_variants: result.message_variants,
          recommended_variant: result.recommended_variant,
          reasoning: result.reasoning,
          send_timing_suggestion: result.send_timing_suggestion,
        });
      }

      return {
        sequence_id: sequenceId,
        steps: generatedSteps,
        overall_strategy: `${params.steps.length}-step outreach sequence generated with consistent narrative thread`,
      };
    },
    onSuccess: (data, variables) => {
      toast.success(`Sequence generated with ${data.steps.length} steps`, {
        description: "All messages saved and ready to use",
      });
      queryClient.invalidateQueries({ 
        queryKey: ['linkedin-message-history', variables.contactId] 
      });
    },
    onError: (error: Error) => {
      console.error('Sequence generation failed:', error);
      toast.error("Failed to generate sequence", {
        description: error.message,
      });
    },
  });
}

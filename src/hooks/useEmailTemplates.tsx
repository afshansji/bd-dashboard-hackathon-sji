import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  category: 'outreach' | 'follow_up' | 'meeting' | 'thank_you' | 'custom';
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useEmailTemplates() {
  return useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates' as any)
        .select('*')
        .eq('is_active', true)
        .order('name') as any;

      if (error) throw error;
      return (data || []) as EmailTemplate[];
    },
  });
}
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ContactData {
  contact_name: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_linkedin_url?: string | null;
  contact_company?: string | null;
  contact_title?: string | null;
  company_website?: string | null;
  company_industry?: string | null;
  company_size?: string | null;
  status: string;
  metadata?: Record<string, any>;
}

interface AddContactParams {
  campaignId: string;
  contactData: ContactData;
}

async function addCampaignContact({ campaignId, contactData }: AddContactParams) {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("User not authenticated");
  }

  // Prepare the contact data
  const insertData = {
    campaign_id: campaignId,
    ...contactData,
    metadata: {
      ...contactData.metadata,
      added_by: user.id,
      added_by_email: user.email,
    },
  };

  // Insert the contact
  const { data, error } = await supabase
    .from("campaign_contacts")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("Error adding contact:", error);
    throw new Error(error.message || "Failed to add contact");
  }

  return data;
}

export function useAddCampaignContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addCampaignContact,
    onSuccess: (_, variables) => {
      // Invalidate campaign contacts query to refresh the list
      queryClient.invalidateQueries({ 
        queryKey: ["campaign-contacts", variables.campaignId] 
      });
      
      // Also invalidate campaign detail query to update stats
      queryClient.invalidateQueries({ 
        queryKey: ["campaign-detail"] 
      });
    },
  });
}


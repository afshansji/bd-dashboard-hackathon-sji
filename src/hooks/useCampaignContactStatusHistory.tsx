import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StatusHistoryEntry {
  id: string;
  contact_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  changed_at: string;
  change_trigger: string;
  notes: string | null;
  created_at: string;
}

export const useCampaignContactStatusHistory = (contactId: string | undefined) => {
  return useQuery({
    queryKey: ["campaign-contact-status-history", contactId],
    queryFn: async () => {
      if (!contactId) throw new Error("Contact ID is required");
      
      const { data, error } = await supabase
        .from("campaign_contact_status_history")
        .select("*")
        .eq("contact_id", contactId)
        .order("changed_at", { ascending: false });

      if (error) throw error;
      return data as StatusHistoryEntry[];
    },
    enabled: !!contactId,
  });
};

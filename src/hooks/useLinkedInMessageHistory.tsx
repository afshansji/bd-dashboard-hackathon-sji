import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useLinkedInMessageHistory(contactId: string | undefined) {
  return useQuery({
    queryKey: ["linkedin-message-history", contactId],
    queryFn: async () => {
      if (!contactId) throw new Error("Contact ID required");

      const { data, error } = await supabase
        .from("campaign_contact_linkedin_messages")
        .select("*")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!contactId,
  });
}

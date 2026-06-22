import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCampaignContactUpdate } from "./useCampaignContactUpdate";

export const useCampaignContactResearch = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateContact = useCampaignContactUpdate();

  return useMutation({
    mutationFn: async ({ contactId, contactSlug }: { contactId: string; contactSlug: string }) => {
      const { data, error } = await supabase.functions.invoke("campaign-contact-research", {
        body: { contactId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: async (data, { contactId, contactSlug }) => {
      // Auto-update status to 'researched' if currently 'identified'
      const { data: contact } = await supabase
        .from("campaign_contacts")
        .select("status")
        .eq("id", contactId)
        .single();

      const hasCompanyData = data?.company_id || data?.company_data?.website;
      
      if (contact?.status === "identified") {
        await updateContact.mutateAsync({
          contactId,
          updates: { status: "researched" }
        });
        
        toast({ 
          title: "Research completed", 
          description: hasCompanyData 
            ? "Contact and company research completed ✓" 
            : "Contact research completed and status updated to Researched ✓" 
        });
      } else {
        toast({ 
          title: "Research completed", 
          description: hasCompanyData
            ? "Contact and company data updated with new insights"
            : "Contact research has been updated with new insights" 
        });
      }

      queryClient.invalidateQueries({ queryKey: ["campaign-contact-by-slug", contactSlug] });
      queryClient.invalidateQueries({ queryKey: ["campaign-contacts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Research failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

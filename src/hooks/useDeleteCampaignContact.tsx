import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export const useDeleteCampaignContact = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async ({ contactId, campaignSlug }: { contactId: string; campaignSlug: string }) => {
      const { error } = await supabase
        .from("campaign_contacts")
        .delete()
        .eq("id", contactId);

      if (error) throw error;
      return { campaignSlug };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["campaign-by-slug"] });
      toast({ title: "Contact deleted successfully" });
      navigate(`/campaigns/${data.campaignSlug}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete contact",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCampaignContactUpdate } from "./useCampaignContactUpdate";

export interface CampaignContactComment {
  id: string;
  contact_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  updated_at: string;
  user_name?: string | null;
  user_email?: string | null;
}

export const useCampaignContactComments = (contactId: string | undefined) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateContact = useCampaignContactUpdate();

  const commentsQuery = useQuery({
    queryKey: ["campaign-contact-comments", contactId],
    queryFn: async () => {
      if (!contactId) throw new Error("Contact ID required");

      const { data, error } = await supabase
        .from("campaign_contact_comments")
        .select("*")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      return data.map(comment => ({
        ...comment,
        user_name: profiles?.find(p => p.id === comment.user_id)?.full_name,
        user_email: profiles?.find(p => p.id === comment.user_id)?.email,
      }));
    },
    enabled: !!contactId,
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ contactId, comment }: { contactId: string; comment: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("campaign_contact_comments")
        .insert({
          contact_id: contactId,
          user_id: user.id,
          comment,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Fetch profile separately
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      return {
        ...data,
        user_name: profile?.full_name,
        user_email: profile?.email,
      };
    },
    onSuccess: async (_, { contactId, comment }) => {
      // Keyword detection for auto-status change
      const lowerComment = comment.toLowerCase();
      const { data: contact } = await supabase
        .from("campaign_contacts")
        .select("status, slug")
        .eq("id", contactId)
        .single();

      if (contact) {
        let newStatus: string | null = null;

        if ((lowerComment.includes("responded") || lowerComment.includes("replied")) && contact.status !== "responded") {
          newStatus = "responded";
        } else if ((lowerComment.includes("meeting") || lowerComment.includes("scheduled") || lowerComment.includes("booked")) && contact.status !== "meeting_booked") {
          newStatus = "meeting_booked";
        } else if (lowerComment.includes("connected") && contact.status === "contacted_linkedin") {
          newStatus = "connected";
        }

        if (newStatus) {
          await updateContact.mutateAsync({
            contactId,
            updates: { status: newStatus }
          });
          
          toast({ 
            title: "Comment added & status updated", 
            description: `Status automatically updated based on comment keywords ✓` 
          });
        } else {
          toast({ title: "Comment added successfully" });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["campaign-contact-comments", contactId] });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to add comment", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("campaign_contact_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-contact-comments", contactId] });
      toast({ title: "Comment deleted" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to delete comment", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  return {
    comments: commentsQuery.data ?? [],
    isLoading: commentsQuery.isLoading,
    addComment: addCommentMutation.mutate,
    deleteComment: deleteCommentMutation.mutate,
    isAddingComment: addCommentMutation.isPending,
  };
};

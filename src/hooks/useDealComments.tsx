import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface DealComment {
  id: string;
  deal_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  updated_at: string;
  synced_to_control_tower?: boolean;
  control_tower_comment_id?: string | null;
  mentioned_users?: string[] | null;
  mentioned_user_emails?: string[] | null;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface AddCommentPayload {
  comment: string;
  mentioned_users?: string[];
  mentioned_user_emails?: string[];
}

export const useDealComments = (dealId: string) => {
  return useQuery({
    queryKey: ["deal-comments", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_comments")
        .select(`
          *,
          user:users(id, first_name, last_name, email)
        `)
        .eq("deal_id", dealId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as DealComment[];
    },
    enabled: !!dealId,
  });
};

export const useAddComment = (dealId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ comment, mentioned_users, mentioned_user_emails }: AddCommentPayload) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("deal_comments")
        .insert({
          deal_id: dealId,
          user_id: user.id,
          comment,
          mentioned_users: mentioned_users || [],
          mentioned_user_emails: mentioned_user_emails || [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-comments", dealId] });
      toast({
        title: "Comment added",
        description: "Your comment has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      });
      console.error("Error adding comment:", error);
    },
  });
};

export const useDeleteComment = (dealId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("deal_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-comments", dealId] });
      toast({
        title: "Comment deleted",
        description: "Your comment has been removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete comment. Please try again.",
        variant: "destructive",
      });
      console.error("Error deleting comment:", error);
    },
  });
};

export interface UpdateCommentPayload {
  commentId: string;
  comment: string;
}

export const useUpdateComment = (dealId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, comment }: UpdateCommentPayload) => {
      // RLS policy ensures users can only update their own comments
      const { data, error } = await supabase
        .from("deal_comments")
        .update({ comment })
        .eq("id", commentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-comments", dealId] });
      toast({
        title: "Comment updated",
        description: "Your comment has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update comment. Please try again.",
        variant: "destructive",
      });
      console.error("Error updating comment:", error);
    },
  });
};
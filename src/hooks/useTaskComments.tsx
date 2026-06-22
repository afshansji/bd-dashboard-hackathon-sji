import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import type { TaskComment, CreateCommentData } from '@/types/comments';
import { extractMentionedUserIds } from '@/utils/mentionParser';
import { createMentionNotifications } from '@/services/notificationService';
import { handleSupabaseError } from '@/utils/supabaseErrors';

export const useTaskComments = (taskId?: string) => {
  const queryClient = useQueryClient();

  // Fetch comments for a task
  const { data: comments = [], isLoading, error, refetch } = useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: async () => {
      if (!taskId) return [];

      try {
        // First, try simplified query without foreign key joins
        const { data, error } = await (supabase as any)
          .from('task_comments')
          .select('*')
          .eq('task_id', taskId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching comments:', error);
          handleSupabaseError(error, 'task_comments');
        }

        if (!data) return [];

        // Then fetch author info separately for each comment
        const commentsWithAuthors = await Promise.all(
          data.map(async (comment: any) => {
            try {
              const { data: authorData } = await supabase
                .from('profiles')
                .select('id, full_name, email, avatar_url')
                .eq('id', comment.author_id)
                .single();

              return {
                ...comment,
                author: authorData || { id: comment.author_id, full_name: 'Unknown', email: '' },
                mentions: [], // We'll fetch mentions separately if needed
              };
            } catch (err) {
              console.warn('Failed to fetch author for comment:', err);
              return {
                ...comment,
                author: { id: comment.author_id, full_name: 'Unknown', email: '' },
                mentions: [],
              };
            }
          })
        );

        return commentsWithAuthors as TaskComment[];
      } catch (error) {
        console.error('Failed to fetch task comments:', error);
        throw error;
      }
    },
    enabled: !!taskId,
    staleTime: 30000, // 30 seconds
  });

  // Create comment
  const createComment = useMutation({
    mutationFn: async ({ data: commentData, taskTitle }: { data: CreateCommentData; taskTitle: string }) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Create comment using type assertion
        const { data: comment, error: commentError } = await (supabase as any)
          .from('task_comments')
          .insert({
            task_id: commentData.task_id,
            author_id: user.id,
            body_text: commentData.body_text,
          })
          .select()
          .single();

        if (commentError) {
          console.error('Error creating comment:', commentError);
          handleSupabaseError(commentError, 'task_comments');
        }

        if (!comment) {
          throw new Error('Failed to create comment');
        }

        // Extract mentioned user IDs from text
        const mentionedUserIds = extractMentionedUserIds(commentData.body_text);

        // Create mention records if any (non-blocking)
        if (mentionedUserIds.length > 0) {
          try {
            const mentions = mentionedUserIds.map(userId => ({
              comment_id: comment.id,
              mentioned_user_id: userId,
            }));

            const { error: mentionError } = await (supabase as any)
              .from('task_comment_mentions')
              .insert(mentions);

            if (mentionError) {
              console.error('Failed to create mentions:', mentionError);
            }

            // Create notifications for mentioned users (non-blocking)
            try {
              await createMentionNotifications(
                comment.id,
                commentData.task_id,
                taskTitle,
                mentionedUserIds,
                user.id,
                commentData.body_text
              );
            } catch (notifError) {
              console.error('Failed to create mention notifications:', notifError);
            }
          } catch (err) {
            console.error('Failed to process mentions:', err);
            // Don't fail the comment creation if mentions fail
          }
        }

        return comment;
      } catch (error: any) {
        console.error('Failed to create comment:', error);
        throw new Error(error.message || 'Failed to post comment');
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', variables.data.task_id] });
      toast({
        title: "Comment posted",
        description: "Your comment has been added successfully.",
      });
    },
    onError: (error: Error) => {
      console.error('Comment creation error:', error);
      toast({
        title: "Failed to post comment",
        description: error.message || 'An error occurred while posting the comment',
        variant: "destructive",
      });
    },
  });

  // Update comment
  const updateComment = useMutation({
    mutationFn: async ({ commentId, bodyText }: { commentId: string; bodyText: string }) => {
      try {
        console.log(`Updating comment ${commentId}...`);

        // Use type assertion
        const { data, error } = await (supabase as any)
          .from('task_comments')
          .update({ body_text: bodyText, edited: true })
          .eq('id', commentId)
          .select()
          .single();

        if (error) {
          console.error('Error updating comment:', error);
          handleSupabaseError(error, 'task_comments');
        }

        console.log('Comment updated successfully');
        return data;
      } catch (error: any) {
        console.error('Failed to update comment:', error);
        throw new Error(error.message || 'Failed to update comment');
      }
    },
    onSuccess: (_data, _variables) => {
      // Invalidate comments for the current task
      if (taskId) {
        queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
      }
      toast({
        title: "Comment updated",
        description: "Your comment has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      console.error('Comment update error:', error);
      toast({
        title: "Failed to update comment",
        description: error.message || 'An error occurred while updating the comment',
        variant: "destructive",
      });
    },
  });

  // Delete comment
  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      try {
        console.log(`Deleting comment ${commentId}...`);

        const { error } = await (supabase as any)
          .from('task_comments')
          .delete()
          .eq('id', commentId);

        if (error) {
          console.error('Error deleting comment:', error);
          handleSupabaseError(error, 'task_comments');
        }

        console.log('Comment deleted successfully');
        return commentId;
      } catch (error: any) {
        console.error('Failed to delete comment:', error);
        throw new Error(error.message || 'Failed to delete comment');
      }
    },
    onSuccess: () => {
      // Invalidate comments for the current task
      if (taskId) {
        queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
      }
      toast({
        title: "Comment deleted",
        description: "Your comment has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      console.error('Comment deletion error:', error);
      toast({
        title: "Failed to delete comment",
        description: error.message || 'An error occurred while deleting the comment',
        variant: "destructive",
      });
    },
  });

  return {
    comments,
    isLoading,
    error,
    refetch,
    createComment: createComment.mutate,
    createCommentAsync: createComment.mutateAsync,
    updateComment: updateComment.mutate,
    deleteComment: deleteComment.mutate,
    isCreating: createComment.isPending,
    isUpdating: updateComment.isPending,
    isDeleting: deleteComment.isPending,
  };
};

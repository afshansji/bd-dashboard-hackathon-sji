import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import type { TaskAttachment } from './useProjectTasks';

export const useTaskAttachments = (taskId?: string) => {
  const queryClient = useQueryClient();

  // Fetch attachments for a specific task
  const { data: attachments = [], isLoading, refetch } = useQuery({
    queryKey: ['task-attachments', taskId],
    queryFn: async () => {
      if (!taskId) return [];

      // Use type assertion to work around missing table types
      const { data, error } = await (supabase as any)
        .from('task_attachments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as TaskAttachment[];
    },
    enabled: !!taskId,
  });

  // Upload attachment
  const uploadAttachment = useMutation({
    mutationFn: async ({ taskId, file }: { taskId: string; file: File }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${taskId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('task-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create attachment record using type assertion
      const { data, error: insertError } = await (supabase as any)
        .from('task_attachments')
        .insert({
          task_id: taskId,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          file_type: file.type || 'application/octet-stream',
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (insertError) {
        // Clean up uploaded file if database insert fails
        await supabase.storage.from('task-files').remove([fileName]);
        throw insertError;
      }

      return data as TaskAttachment;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', variables.taskId] });
      toast({
        title: "File uploaded",
        description: "Attachment has been uploaded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload attachment.",
        variant: "destructive",
      });
    },
  });

  // Delete attachment
  const deleteAttachment = useMutation({
    mutationFn: async (attachment: TaskAttachment) => {
      // Delete from database using type assertion
      const { error: dbError } = await (supabase as any)
        .from('task_attachments')
        .delete()
        .eq('id', attachment.id);

      if (dbError) throw dbError;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('task-files')
        .remove([attachment.file_path]);

      if (storageError) {
        console.error('Failed to delete file from storage:', storageError);
        // Don't throw error here as the database record is already deleted
      }
    },
    onSuccess: (_data, attachment) => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', attachment.task_id] });
      toast({
        title: "File deleted",
        description: "Attachment has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete attachment.",
        variant: "destructive",
      });
    },
  });

  // Get public URL for attachment
  const getAttachmentUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from('task-files')
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  };

  return {
    attachments,
    isLoading,
    refetch,
    uploadAttachment: uploadAttachment.mutate,
    uploadAttachmentAsync: uploadAttachment.mutateAsync,
    deleteAttachment: deleteAttachment.mutate,
    getAttachmentUrl,
    isUploading: uploadAttachment.isPending,
  };
};

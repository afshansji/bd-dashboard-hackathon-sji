import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

const BUCKET = "job-lead-attachments";

const ALLOWED_EXTENSIONS = [".pdf", ".csv", ".xls", ".xlsx"];

export interface JobLeadAttachment {
  id: string;
  job_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_by: string;
  created_at: string;
  uploader_name?: string;
}

function isAllowedFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function useJobLeadAttachments(jobId?: string) {
  const queryClient = useQueryClient();

  const { data: attachments = [], isLoading, refetch } = useQuery({
    queryKey: ["job-lead-attachments", jobId],
    queryFn: async () => {
      if (!jobId) return [];

      const { data, error } = await supabase
        .from("job_lead_workspace_attachments")
        .select(
          "id, job_id, file_name, file_path, file_size, file_type, uploaded_by, created_at, profiles:uploaded_by(full_name)",
        )
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data ?? []).map((row) => {
        const profile = Array.isArray(row.profiles)
          ? row.profiles[0]
          : row.profiles;
        return {
          id: row.id,
          job_id: row.job_id,
          file_name: row.file_name,
          file_path: row.file_path,
          file_size: row.file_size,
          file_type: row.file_type,
          uploaded_by: row.uploaded_by,
          created_at: row.created_at,
          uploader_name:
            (profile as { full_name?: string } | null)?.full_name ?? undefined,
        } satisfies JobLeadAttachment;
      });
    },
    enabled: Boolean(jobId),
  });

  const uploadAttachment = useMutation({
    mutationFn: async ({ jobId: targetJobId, file }: { jobId: string; file: File }) => {
      if (!isAllowedFile(file)) {
        throw new Error("Only PDF, Excel, and CSV files are supported.");
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be signed in to upload files.");

      const fileExt = file.name.split(".").pop() ?? "bin";
      const filePath = `${targetJobId}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data, error: insertError } = await supabase
        .from("job_lead_workspace_attachments")
        .insert({
          job_id: targetJobId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type || "application/octet-stream",
          uploaded_by: user.id,
        })
        .select("*")
        .single();

      if (insertError) {
        await supabase.storage.from(BUCKET).remove([filePath]);
        throw insertError;
      }

      return data as JobLeadAttachment;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["job-lead-attachments", variables.jobId],
      });
      toast({ title: "Attachment uploaded", description: "Your team can now view this file." });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAttachment = useMutation({
    mutationFn: async (attachment: JobLeadAttachment) => {
      const { error: dbError } = await supabase
        .from("job_lead_workspace_attachments")
        .delete()
        .eq("id", attachment.id);

      if (dbError) throw dbError;

      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .remove([attachment.file_path]);

      if (storageError) {
        console.error("Failed to delete attachment from storage:", storageError);
      }
    },
    onSuccess: (_data, attachment) => {
      queryClient.invalidateQueries({
        queryKey: ["job-lead-attachments", attachment.job_id],
      });
      toast({ title: "Attachment deleted" });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const openAttachment = async (attachment: JobLeadAttachment) => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(attachment.file_path, 3600);

    if (error) throw error;
    if (!data?.signedUrl) throw new Error("Could not open attachment.");

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  return {
    attachments,
    isLoading,
    refetch,
    uploadAttachment: uploadAttachment.mutate,
    uploadAttachmentAsync: uploadAttachment.mutateAsync,
    deleteAttachment: deleteAttachment.mutate,
    openAttachment,
    isUploading: uploadAttachment.isPending,
    isDeleting: deleteAttachment.isPending,
  };
}

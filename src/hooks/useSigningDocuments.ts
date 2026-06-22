import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type {
  SigningDocument,
  SigningDocumentFilters,
  CreateSigningDocumentRequest,
  SigningActivityLog,
  SigningTemplate,
  DocumentType,
} from "@/types/signing";

// ============================================================================
// LIST & GET HOOKS
// ============================================================================

export const useSigningDocuments = (filters?: SigningDocumentFilters) => {
  return useQuery({
    queryKey: ["signing-documents", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.dealId) params.append("dealId", filters.dealId);
      if (filters?.clientId) params.append("clientId", filters.clientId);
      if (filters?.status) params.append("status", filters.status);
      if (filters?.documentType) params.append("documentType", filters.documentType);

      const { data, error } = await supabase.functions.invoke(
        `signing-documents-manage/list?${params.toString()}`,
        { method: "GET" }
      );

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to fetch documents");

      return data.documents as SigningDocument[];
    },
  });
};

export const useSigningDocument = (documentId?: string) => {
  return useQuery({
    queryKey: ["signing-document", documentId],
    queryFn: async () => {
      if (!documentId) return null;

      const { data, error } = await supabase.functions.invoke(
        `signing-documents-manage/${documentId}`,
        { method: "GET" }
      );

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to fetch document");

      return data.document as SigningDocument;
    },
    enabled: !!documentId,
  });
};

export const useSigningDocumentActivity = (documentId?: string) => {
  return useQuery({
    queryKey: ["signing-document-activity", documentId],
    queryFn: async () => {
      if (!documentId) return [];

      const { data, error } = await supabase.functions.invoke(
        `signing-documents-manage/${documentId}/activity`,
        { method: "GET" }
      );

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to fetch activity");

      return data.activities as SigningActivityLog[];
    },
    enabled: !!documentId,
  });
};

// ============================================================================
// TEMPLATE HOOKS
// ============================================================================

export const useSigningTemplates = (documentType?: DocumentType) => {
  return useQuery({
    queryKey: ["signing-templates", documentType],
    queryFn: async () => {
      const params = documentType ? `?documentType=${documentType}` : "";

      const { data, error } = await supabase.functions.invoke(
        `signing-documents-manage/templates${params}`,
        { method: "GET" }
      );

      if (error) throw error;
      if (!data?.ok) {
        const errorMessage = data?.error || "Failed to fetch templates";
        // Check if it's an integration not configured error
        if (errorMessage.toLowerCase().includes("not configured") || 
            errorMessage.toLowerCase().includes("integration")) {
          throw new Error("INTEGRATION_NOT_CONFIGURED");
        }
        throw new Error(errorMessage);
      }

      return data.templates as SigningTemplate[];
    },
    retry: (failureCount, error) => {
      // Don't retry if integration is not configured
      if (error instanceof Error && error.message === "INTEGRATION_NOT_CONFIGURED") {
        return false;
      }
      return failureCount < 3;
    },
  });
};

// ============================================================================
// CREATE HOOK
// ============================================================================

export const useCreateSigningDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateSigningDocumentRequest) => {
      const { data, error } = await supabase.functions.invoke(
        "signing-documents-manage/create",
        {
          method: "POST",
          body: request,
        }
      );

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to create document");

      return data.document as SigningDocument;
    },
    onSuccess: (document) => {
      queryClient.invalidateQueries({ queryKey: ["signing-documents"] });
      toast({
        title: "Document Created",
        description: `${document.document_type.toUpperCase()} "${document.title}" has been created.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// ============================================================================
// SEND HOOK
// ============================================================================

export const useSendSigningDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      message,
      subject,
    }: {
      documentId: string;
      message?: string;
      subject?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        `signing-documents-manage/${documentId}/send`,
        {
          method: "POST",
          body: { message, subject },
        }
      );

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to send document");

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["signing-documents"] });
      queryClient.invalidateQueries({ queryKey: ["signing-document", variables.documentId] });
      toast({
        title: "Document Sent",
        description: "The document has been sent to all recipients.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Send Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// ============================================================================
// RESEND HOOK
// ============================================================================

export const useResendSigningDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId }: { documentId: string }) => {
      const { data, error } = await supabase.functions.invoke(
        `signing-documents-manage/${documentId}/resend`,
        { method: "POST" }
      );

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to resend");

      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["signing-documents"] });
      queryClient.invalidateQueries({ queryKey: ["signing-document", variables.documentId] });
      toast({
        title: "Reminder Sent",
        description: `Reminder sent to ${data.resentTo} pending recipient(s).`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Resend Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// ============================================================================
// VOID HOOK
// ============================================================================

export const useVoidSigningDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      reason,
    }: {
      documentId: string;
      reason?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        `signing-documents-manage/${documentId}/void`,
        {
          method: "POST",
          body: { reason },
        }
      );

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to void document");

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["signing-documents"] });
      queryClient.invalidateQueries({ queryKey: ["signing-document", variables.documentId] });
      toast({
        title: "Document Voided",
        description: "The document has been voided and can no longer be signed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Void Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// ============================================================================
// EMBED SESSION HOOK
// ============================================================================

export const useSigningEmbedSession = () => {
  return useMutation({
    mutationFn: async ({
      documentId,
      recipientEmail,
    }: {
      documentId: string;
      recipientEmail: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        `signing-documents-manage/${documentId}/embed-session`,
        {
          method: "POST",
          body: { recipientEmail },
        }
      );

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to get signing session");

      return {
        sessionUrl: data.sessionUrl as string,
        expiresAt: data.expiresAt as string,
      };
    },
    onError: (error: Error) => {
      toast({
        title: "Session Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// ============================================================================
// DOWNLOAD HOOK
// ============================================================================

export const useDownloadSigningDocument = () => {
  return useMutation({
    mutationFn: async ({
      documentId,
      type,
    }: {
      documentId: string;
      type: "pdf" | "certificate";
    }) => {
      const { data, error } = await supabase.functions.invoke(
        `signing-documents-manage/${documentId}/download?type=${type}`,
        { method: "GET" }
      );

      if (error) throw error;
      if (!data?.ok || !data?.url) throw new Error(data?.error || "Download not available");

      // Open download URL in new tab
      window.open(data.url, "_blank");

      return data;
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Download Started",
        description: `Your ${variables.type === "pdf" ? "document" : "certificate"} is downloading.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Download Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// ============================================================================
// DUPLICATE HOOK
// ============================================================================

export const useDuplicateSigningDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId }: { documentId: string }) => {
      const { data, error } = await supabase.functions.invoke(
        `signing-documents-manage/${documentId}/duplicate`,
        { method: "POST" }
      );

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to duplicate");

      return data.document as SigningDocument;
    },
    onSuccess: (document) => {
      queryClient.invalidateQueries({ queryKey: ["signing-documents"] });
      toast({
        title: "Document Duplicated",
        description: `A copy "${document.title}" has been created as a draft.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Duplicate Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// ============================================================================
// RECIPIENT HOOKS
// ============================================================================

export const useAddRecipient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      recipient,
    }: {
      documentId: string;
      recipient: {
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        signingOrder: number;
      };
    }) => {
      const { data, error } = await supabase.functions.invoke(
        `signing-documents-manage/${documentId}/recipients`,
        {
          method: "POST",
          body: recipient,
        }
      );

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to add recipient");

      return data.recipient;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["signing-document", variables.documentId] });
      toast({
        title: "Recipient Added",
        description: "The recipient has been added to the document.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Add Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useRemoveRecipient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      recipientId,
    }: {
      documentId: string;
      recipientId: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        `signing-documents-manage/${documentId}/recipients/${recipientId}`,
        { method: "DELETE" }
      );

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to remove recipient");

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["signing-document", variables.documentId] });
      toast({
        title: "Recipient Removed",
        description: "The recipient has been removed from the document.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Remove Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// ============================================================================
// WATCHER HOOKS
// ============================================================================

export const useAddWatcher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      userId,
      role,
    }: {
      documentId: string;
      userId: string;
      role: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        `signing-documents-manage/${documentId}/watchers`,
        {
          method: "POST",
          body: { userId, role },
        }
      );

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to add watcher");

      return data.watcher;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["signing-document", variables.documentId] });
      toast({
        title: "Watcher Added",
        description: "The user will now receive notifications for this document.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Add Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useRemoveWatcher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      watcherId,
    }: {
      documentId: string;
      watcherId: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        `signing-documents-manage/${documentId}/watchers/${watcherId}`,
        { method: "DELETE" }
      );

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to remove watcher");

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["signing-document", variables.documentId] });
      toast({
        title: "Watcher Removed",
        description: "The user will no longer receive notifications.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Remove Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// ============================================================================
// STATS HOOK (for dashboard)
// ============================================================================

// Type for signing document stats query (until types regenerate)
interface SigningDocumentRow {
  id: string;
  status: string;
  document_type: string;
  created_at: string;
  sent_at: string | null;
  completed_at: string | null;
}

export const useSigningDocumentStats = () => {
  return useQuery({
    queryKey: ["signing-document-stats"],
    queryFn: async () => {
      // Fetch documents directly from Supabase for stats
      const { data: documents, error } = await supabase
        .from("signing_documents" as any)
        .select("id, status, document_type, created_at, sent_at, completed_at") as { 
          data: SigningDocumentRow[] | null; 
          error: any 
        };

      if (error) throw error;

      const stats = {
        total: documents?.length || 0,
        byStatus: {} as Record<string, number>,
        byType: {} as Record<string, number>,
        avgTimeToSign: 0,
        completionRate: 0,
      };

      if (documents) {
        // Count by status
        documents.forEach((doc) => {
          stats.byStatus[doc.status] = (stats.byStatus[doc.status] || 0) + 1;
          stats.byType[doc.document_type] = (stats.byType[doc.document_type] || 0) + 1;
        });

        // Calculate completion rate
        const sentOrCompleted = documents.filter((d) =>
          ["sent", "viewed", "completed", "declined", "expired"].includes(d.status)
        ).length;
        const completed = documents.filter((d) => d.status === "completed").length;
        stats.completionRate = sentOrCompleted > 0 ? (completed / sentOrCompleted) * 100 : 0;

        // Calculate average time to sign (in hours)
        const completedDocs = documents.filter((d) => d.sent_at && d.completed_at);
        if (completedDocs.length > 0) {
          const totalHours = completedDocs.reduce((sum, doc) => {
            const sent = new Date(doc.sent_at!).getTime();
            const completed = new Date(doc.completed_at!).getTime();
            return sum + (completed - sent) / (1000 * 60 * 60);
          }, 0);
          stats.avgTimeToSign = totalHours / completedDocs.length;
        }
      }

      return stats;
    },
  });
};

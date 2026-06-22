import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  contactId: string;
  campaignId: string;
  cc?: string[];
  bcc?: string[];
}

interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export const useSendCampaignEmail = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (params: SendEmailParams): Promise<SendEmailResponse> => {
      const { data, error } = await supabase.functions.invoke('send-campaign-email', {
        body: params
      });

      if (error) {
        throw new Error(error.message || 'Failed to send email');
      }

      return data as SendEmailResponse;
    },
    onSuccess: (data, variables) => {
      toast.success('Email sent successfully', {
        description: 'Your email has been sent and logged in the contact history'
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries({ 
        queryKey: ["campaign-contact-by-slug"] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["campaign-contact-status-history", variables.contactId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["admin-campaign-detail", variables.campaignId] 
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to send email', {
        description: error.message
      });
    }
  });

  return {
    sendEmail: mutation.mutateAsync,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError
  };
};

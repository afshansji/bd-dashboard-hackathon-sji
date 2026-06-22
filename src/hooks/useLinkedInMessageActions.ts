import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MarkAsSentParams {
  messageId: string;
  variantSent: string;
  contactId: string;
  messageType?: string;
}

interface LogResponseParams {
  messageId: string;
  responseType: 'positive' | 'neutral' | 'negative' | 'no_response';
  notes?: string;
}

interface UpdateMessageVariantParams {
  messageId: string;
  variantName: string;
  newMessage: string;
  characterCount: number;
}

interface UpdateNotesParams {
  messageId: string;
  notes: string;
}

export function useMarkMessageAsSent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, variantSent, contactId, messageType }: MarkAsSentParams) => {
      // Update the message as sent
      const { error: messageError } = await supabase
        .from('campaign_contact_linkedin_messages')
        .update({
          sent_at: new Date().toISOString(),
          variant_sent: variantSent,
        })
        .eq('id', messageId);

      if (messageError) throw messageError;

      const now = new Date().toISOString();
      const contactUpdates: Record<string, string> = {
        status: 'messaged',
        updated_at: now,
        last_activity_at: now,
      };

      if (messageType === 'connection_request') {
        contactUpdates.linkedin_request_sent_at = now;
      }

      // Update contact status to "messaged"
      const { error: contactError } = await supabase
        .from('campaign_contacts')
        .update(contactUpdates)
        .eq('id', contactId);

      if (contactError) throw contactError;

      return { messageId, variantSent };
    },
    onSuccess: (_, variables) => {
      toast.success("Message marked as sent", {
        description: `Contact status updated to "Messaged"`,
      });
      queryClient.invalidateQueries({ queryKey: ['linkedin-message-history', variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-contact'] });
    },
    onError: (error: Error) => {
      toast.error("Failed to mark message as sent", { description: error.message });
    },
  });
}

export function useLogMessageResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, responseType, notes }: LogResponseParams) => {
      const { data, error } = await supabase
        .from('campaign_contact_linkedin_messages')
        .update({
          response_received: true,
          response_type: responseType,
          response_received_at: new Date().toISOString(),
          notes: notes || null,
        })
        .eq('id', messageId)
        .select('contact_id')
        .single();

      if (error) throw error;

      // Update contact status to "responded" if positive response
      if (responseType === 'positive' && data?.contact_id) {
        await supabase
          .from('campaign_contacts')
          .update({
            status: 'responded',
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.contact_id);
      }

      return { messageId, responseType, contactId: data?.contact_id };
    },
    onSuccess: (data) => {
      toast.success("Response logged", {
        description: data.responseType === 'positive' ? "Contact status updated to Responded" : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['linkedin-message-history', data.contactId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-contact'] });
    },
    onError: (error: Error) => {
      toast.error("Failed to log response", { description: error.message });
    },
  });
}

export function useUpdateMessageVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, variantName, newMessage, characterCount }: UpdateMessageVariantParams) => {
      // First fetch the current message variants
      const { data: message, error: fetchError } = await supabase
        .from('campaign_contact_linkedin_messages')
        .select('message_variants, contact_id')
        .eq('id', messageId)
        .single();

      if (fetchError) throw fetchError;

      // Update the specific variant
      const updatedVariants = (message.message_variants as any[]).map((v: any) => {
        if (v.variant_name === variantName) {
          return { ...v, message: newMessage, character_count: characterCount };
        }
        return v;
      });

      // Save back to database
      const { error: updateError } = await supabase
        .from('campaign_contact_linkedin_messages')
        .update({ message_variants: updatedVariants })
        .eq('id', messageId);

      if (updateError) throw updateError;

      return { messageId, contactId: message.contact_id };
    },
    onSuccess: (data) => {
      toast.success("Message updated");
      queryClient.invalidateQueries({ queryKey: ['linkedin-message-history', data.contactId] });
    },
    onError: (error: Error) => {
      toast.error("Failed to update message", { description: error.message });
    },
  });
}

export function useUpdateMessageNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, notes }: UpdateNotesParams) => {
      const { data, error } = await supabase
        .from('campaign_contact_linkedin_messages')
        .update({ notes })
        .eq('id', messageId)
        .select('contact_id')
        .single();

      if (error) throw error;
      return { messageId, contactId: data.contact_id };
    },
    onSuccess: (data) => {
      toast.success("Notes saved");
      queryClient.invalidateQueries({ queryKey: ['linkedin-message-history', data.contactId] });
    },
    onError: (error: Error) => {
      toast.error("Failed to save notes", { description: error.message });
    },
  });
}

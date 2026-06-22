import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ZeroBounceConfig {
  id: string;
  is_active: boolean;
  last_tested_at: string | null;
  test_status: string | null;
  credits_remaining: number | null;
  created_at: string;
}

interface TestApiKeyResponse {
  ok: boolean;
  credits?: number;
  error?: string;
}

interface SaveApiKeyResponse {
  ok: boolean;
  credits?: number;
  error?: string;
}

interface ValidationResult {
  email: string;
  status: string;
  sub_status?: string;
  free_email?: boolean;
  did_you_mean?: string;
  error?: string;
}

interface ValidateEmailsResponse {
  ok: boolean;
  results?: ValidationResult[];
  error?: string;
}

// Get Zerobounce configuration
export function useZeroBounceConfig() {
  return useQuery<{ ok: boolean; configured: boolean; config: ZeroBounceConfig | null }>({
    queryKey: ["zerobounce-config"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("zerobounce-manage", {
        method: "GET",
      });

      if (error) throw error;
      return data;
    },
  });
}

// Test Zerobounce API key
export function useTestZeroBounceApiKey() {
  return useMutation<TestApiKeyResponse, Error, { apiKey: string }>({
    mutationFn: async ({ apiKey }) => {
      const { data, error } = await supabase.functions.invoke("zerobounce-manage", {
        body: {
          action: "test",
          apiKey,
        },
      });

      if (error) throw error;
      return data;
    },
  });
}

// Save Zerobounce API key
export function useSaveZeroBounceApiKey() {
  const queryClient = useQueryClient();

  return useMutation<SaveApiKeyResponse, Error, { apiKey: string }>({
    mutationFn: async ({ apiKey }) => {
      const { data, error } = await supabase.functions.invoke("zerobounce-manage", {
        body: {
          action: "save",
          apiKey,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zerobounce-config"] });
      toast.success("Zerobounce API key saved successfully");
    },
    onError: (error) => {
      toast.error(`Failed to save API key: ${error.message}`);
    },
  });
}

// Delete Zerobounce API key
export function useDeleteZeroBounceApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("zerobounce-manage", {
        body: {
          action: "delete",
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zerobounce-config"] });
      toast.success("Zerobounce API key deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });
}

// Validate email(s)
export function useValidateEmails() {
  return useMutation<ValidateEmailsResponse, Error, { emails: string | string[] }>({
    mutationFn: async ({ emails }) => {
      const { data, error } = await supabase.functions.invoke("zerobounce-manage", {
        body: {
          action: "validate",
          emails,
        },
      });

      if (error) throw error;
      return data;
    },
  });
}

// Get Zerobounce credits
export function useGetZeroBounceCredits() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("zerobounce-manage", {
        body: {
          action: "get-credits",
        },
      });

      if (error) throw error;
      return data;
    },
  });
}

// Get validation history for a contact
export function useContactValidationHistory(contactId: string) {
  return useQuery({
    queryKey: ["contact-validation-history", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("zerobounce_validations")
        .select("*")
        .eq("campaign_contact_id", contactId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!contactId,
  });
}

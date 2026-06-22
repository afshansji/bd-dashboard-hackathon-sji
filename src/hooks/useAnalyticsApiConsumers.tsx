import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AnalyticsPeriod = 'daily' | 'weekly' | 'monthly' | 'all';
export type PushFrequency = 'daily' | 'weekly' | 'monthly' | 'manual';

export interface AnalyticsApiConsumerRow {
  id: string;
  name: string;
  description: string | null;
  api_secret_hash: string;
  webhook_url: string | null;
  webhook_secret: string | null;
  is_active: boolean;
  push_enabled: boolean;
  push_frequency: string;
  allowed_periods: string[];
  last_push_at: string | null;
  last_push_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAnalyticsApiConsumerInput {
  name: string;
  description?: string | null;
  webhook_url?: string | null;
  webhook_secret?: string | null;
  is_active?: boolean;
  push_enabled?: boolean;
  push_frequency?: PushFrequency;
  allowed_periods?: AnalyticsPeriod[];
}

export interface UpdateAnalyticsApiConsumerInput {
  name?: string;
  description?: string | null;
  webhook_url?: string | null;
  webhook_secret?: string | null;
  is_active?: boolean;
  push_enabled?: boolean;
  push_frequency?: PushFrequency;
  allowed_periods?: AnalyticsPeriod[];
  last_push_at?: string | null;
  last_push_status?: string | null;
}

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function hashSecret(plain: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(plain));
  return toHex(digest);
}

function generateApiSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return toBase64Url(bytes);
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) out[key] = value;
  }
  return out as Partial<T>;
}

export function useAnalyticsApiConsumers() {
  return useQuery({
    queryKey: ['analytics-api-consumers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analytics_api_consumers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as AnalyticsApiConsumerRow[];
    },
  });
}

export function useCreateAnalyticsApiConsumer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAnalyticsApiConsumerInput) => {
      const plainSecret = generateApiSecret();
      const apiSecretHash = await hashSecret(plainSecret);

      const allowedPeriods = input.allowed_periods ?? ['daily', 'weekly', 'monthly', 'all'];

      const { data, error } = await supabase
        .from('analytics_api_consumers')
        .insert({
          name: input.name,
          description: input.description ?? null,
          api_secret_hash: apiSecretHash,
          webhook_url: input.webhook_url ?? null,
          webhook_secret: input.webhook_secret ?? null,
          is_active: input.is_active ?? true,
          push_enabled: input.push_enabled ?? false,
          push_frequency: input.push_frequency ?? 'manual',
          allowed_periods: allowedPeriods,
        })
        .select('*')
        .single();

      if (error) throw error;
      return { consumer: data as AnalyticsApiConsumerRow, plainSecret };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics-api-consumers'] });
      toast.success('API consumer created');
    },
    onError: (err: Error) => {
      toast.error(`Failed to create API consumer: ${err.message}`);
    },
  });
}

export function useUpdateAnalyticsApiConsumer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateAnalyticsApiConsumerInput }) => {
      const updatePayload = stripUndefined({
        ...updates,
      });

      const { data, error } = await supabase
        .from('analytics_api_consumers')
        .update(updatePayload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return data as AnalyticsApiConsumerRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['analytics-api-consumers'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-api-consumer', data.id] });
      toast.success('API consumer updated');
    },
    onError: (err: Error) => {
      toast.error(`Failed to update API consumer: ${err.message}`);
    },
  });
}

export function useDeleteAnalyticsApiConsumer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('analytics_api_consumers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics-api-consumers'] });
      toast.success('API consumer deleted');
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete API consumer: ${err.message}`);
    },
  });
}

export function useRegenerateAnalyticsApiSecret() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const plainSecret = generateApiSecret();
      const apiSecretHash = await hashSecret(plainSecret);

      const { data, error } = await supabase
        .from('analytics_api_consumers')
        .update({ api_secret_hash: apiSecretHash })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return { consumer: data as AnalyticsApiConsumerRow, plainSecret };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics-api-consumers'] });
      toast.success('API secret regenerated');
    },
    onError: (err: Error) => {
      toast.error(`Failed to regenerate API secret: ${err.message}`);
    },
  });
}

export function useTriggerAnalyticsPush() {
  return useMutation({
    mutationFn: async (consumerId: string) => {
      const { data, error } = await supabase.functions.invoke('push-analytics-to-consumers', {
        body: { consumer_id: consumerId },
      });
      if (error) throw error;
      return data as { pushed: number; results: Array<{ id: string; name: string; status: string; error?: string }> };
    },
    onSuccess: (result) => {
      toast.success(`Push completed (pushed: ${result.pushed})`);
    },
    onError: (err: Error) => {
      toast.error(`Push failed: ${err.message}`);
    },
  });
}


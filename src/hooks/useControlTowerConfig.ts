import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface ControlTowerConfig {
  url: string;
  anon_key: string;
  is_active: boolean;
}

export const useControlTowerConfig = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['control-tower-config'],
    queryFn: async (): Promise<ControlTowerConfig> => {
      // Try to fetch from database first
      const { data, error } = await supabase
        .from('ai_configurations')
        .select('configuration_data, user_id')
        .eq('configuration_type', 'control_tower')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // If we have DB config, use it
      if (data?.configuration_data) {
        const config = data.configuration_data as any;
        return {
          url: config.url || '',
          anon_key: config.anon_key || '',
          is_active: config.is_active ?? true,
        };
      }

      // Fallback to environment variables
      return {
        url: import.meta.env.VITE_CONTROL_TOWER_URL || '',
        anon_key: import.meta.env.VITE_CONTROL_TOWER_ANON_KEY || '',
        is_active: true,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!user,
  });
};

export const useSaveControlTowerConfig = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (config: ControlTowerConfig) => {
      if (!user) throw new Error('User not authenticated');

      // Check if config exists
      const { data: existing } = await supabase
        .from('ai_configurations')
        .select('id')
        .eq('configuration_type', 'control_tower')
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('ai_configurations')
          .update({
            configuration_data: {
              url: config.url,
              anon_key: config.anon_key,
              is_active: config.is_active,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('ai_configurations')
          .insert({
            user_id: user.id,
            configuration_type: 'control_tower',
            configuration_data: {
              url: config.url,
              anon_key: config.anon_key,
              is_active: config.is_active,
            },
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control-tower-config'] });
      queryClient.invalidateQueries({ queryKey: ['control-tower-leads'] });
      queryClient.invalidateQueries({ queryKey: ['control-tower-warm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['control-tower-deals'] });
      queryClient.invalidateQueries({ queryKey: ['control-tower-clients'] });
    },
  });
};

export const useTestControlTowerConnection = () => {
  return useMutation({
    mutationFn: async (config: ControlTowerConfig) => {
      const { createClient } = await import('@supabase/supabase-js');
      
      if (!config.url || !config.anon_key) {
        throw new Error('URL and Anon Key are required');
      }

      const testClient = createClient(config.url, config.anon_key);
      
      // Try a simple query to test connection
      const { error } = await testClient
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .limit(1);

      if (error) {
        throw new Error(`Connection failed: ${error.message}`);
      }

      return { success: true };
    },
  });
};

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Factory function to create a Control Tower client with dynamic credentials
export const createControlTowerClient = (url: string, anonKey: string): SupabaseClient => {
  if (!url || !anonKey) {
    throw new Error('Control Tower URL and Anon Key are required');
  }
  
  return createClient(url, anonKey, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  });
};

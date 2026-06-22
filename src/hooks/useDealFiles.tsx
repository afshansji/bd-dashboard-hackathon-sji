import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface DealFile {
  id: string;
  deal_id: string | null;
  client_id: string | null;
  category: string | null;
  drive_file_id: string | null;
  drive_folder_id: string | null;
  drive_file_name: string | null;
  drive_file_type: string | null;
  storage_bucket_path: string | null;
  json_snapshot_path: string | null;
  file_size: number | null;
  checksum: string | null;
  drive_last_modified_at: string | null;
  drive_created_at: string | null;
  metadata: any;
  drive_folder_url: string | null;
  created_at: string;
  updated_at: string;
}

interface UseDealFilesParams {
  clientId?: string;
  dealId?: string;
  enabled?: boolean;
}

interface UseDealFilesReturn {
  files: DealFile[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDealFiles({ clientId, dealId, enabled = true }: UseDealFilesParams = {}): UseDealFilesReturn {
  const { user } = useAuth();
  const [files, setFiles] = useState<DealFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    if (!user?.id || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase.from('deal_files').select('*').order('updated_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      if (dealId) {
        query = query.eq('deal_id', dealId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setFiles((data || []) as DealFile[]);
    } catch (err) {
      console.error('Failed to load deal files', err);
      setError(err instanceof Error ? err.message : 'Unable to load stored files');
    } finally {
      setLoading(false);
    }
  }, [user?.id, enabled, clientId, dealId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const refetch = useCallback(async () => {
    await fetchFiles();
  }, [fetchFiles]);

  return {
    files,
    loading,
    error,
    refetch,
  };
}

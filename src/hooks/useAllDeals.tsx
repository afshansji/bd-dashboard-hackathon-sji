import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { LocalDealFilters } from '@/hooks/useDeals';

export function useAllDeals(
  page: number = 1,
  limit: number = 25,
  filters?: LocalDealFilters
) {
  const { user } = useAuth();
  const [data, setData] = useState<{ data: any[]; total: number }>({ data: [], total: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        
        let query = supabase
          .from('deals')
          .select(
            `
            *,
            pods(name),
            deal_files:deal_files(
              id,
              deal_id,
              client_id,
              category,
              drive_file_id,
              drive_folder_id,
              drive_file_name,
              drive_file_type,
              drive_last_modified_at,
              drive_created_at,
              storage_bucket_path,
              json_snapshot_path,
              file_size,
              checksum,
              metadata,
              drive_folder_url,
              created_at,
              updated_at
          )
        `,
          { count: 'exact' }
        );
        
        // Apply stage filter if provided
        if (filters?.stages?.length) {
          query = query.in('stage', filters.stages);
        }
        
        // Apply status filter
        if (filters?.statuses && filters.statuses.length > 0) {
          query = query.in('status', filters.statuses);
        }
        
        // If hideStaleDeals is enabled, exclude 'on_hold' status
        if (filters?.hideStaleDeals) {
          query = query.neq('status', 'on_hold');
        }

        // Apply filters
        if (filters?.categories?.length) {
          query = query.in('category', filters.categories);
        }

        if (filters?.dealTypes?.length) {
          query = query.in('dealtype', filters.dealTypes);
        }

        if (filters?.podIds?.length) {
          query = query.in('pod_id', filters.podIds);
        }

        if (filters?.ownerIds?.length) {
          query = query.in('owner_id', filters.ownerIds);
        }

        if (filters?.pmIds?.length) {
          query = query.in('pm_assigned_id', filters.pmIds);
        }

        if (filters?.syncedOnly) {
          query = query.eq('synced_from_control_tower', true);
        }

        if (filters?.dateFrom) {
          query = query.gte('close_date', filters.dateFrom.toISOString());
        }

        if (filters?.dateTo) {
          query = query.lte('close_date', filters.dateTo.toISOString());
        }

        if (filters?.createdDateFrom) {
          query = query.gte('created_at', filters.createdDateFrom.toISOString());
        }

        if (filters?.createdDateTo) {
          query = query.lte('created_at', filters.createdDateTo.toISOString());
        }

        if (filters?.search) {
          query = query.or(`title.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
        }

        const { data: dealsData, error, count } = await query
          .order('amount', { ascending: false, nullsFirst: false })
          .order('updated_at', { ascending: false })
          .range(from, to);
        
        if (error) throw error;
        
        if (!dealsData || dealsData.length === 0) {
          setData({ data: [], total: count || 0 });
          setIsLoading(false);
          return;
        }

        // Fetch related data separately
        const clientIds = [...new Set(dealsData.map(d => d.client_id).filter(Boolean))];
        const ownerIds = [...new Set(dealsData.map(d => d.owner_id).filter(Boolean))];
        const pmIds = [...new Set(dealsData.map(d => d.pm_assigned_id).filter(Boolean))];

        const [clientsRes, ownersRes, pmsRes] = await Promise.all([
          clientIds.length > 0 
            ? supabase.from('clients').select('id, name, email, phone, contact_person, company, slug').in('id', clientIds)
            : Promise.resolve({ data: [] }),
          ownerIds.length > 0
            ? supabase.from('users').select('id, first_name, last_name').in('id', ownerIds)
            : Promise.resolve({ data: [] }),
          pmIds.length > 0
            ? supabase.from('users').select('id, first_name, last_name').in('id', pmIds)
            : Promise.resolve({ data: [] })
        ]);

        // Create lookup maps
        const clientsMap = new Map<string, any>(clientsRes.data?.map(c => [c.id, c] as [string, any]) || []);
        const usersMap = new Map<string, any>([
          ...(ownersRes.data?.map(u => [u.id, u] as [string, any]) || []),
          ...(pmsRes.data?.map(u => [u.id, u] as [string, any]) || [])
        ]);
        
        // Transform to match expected format with related data
        const deals = dealsData.map((deal: any) => {
          const client = deal.client_id ? clientsMap.get(deal.client_id) : null;
          const owner = deal.owner_id ? usersMap.get(deal.owner_id) : null;
          const pm = deal.pm_assigned_id ? usersMap.get(deal.pm_assigned_id) : null;

          return {
            id: deal.id,
            deal_name: deal.title,
            client_id: deal.client_id,
            client_name: (client as any)?.name || (client as any)?.company || '-',
            client_slug: (client as any)?.slug || null,
            client_email: (client as any)?.email || '-',
            client_phone: (client as any)?.phone || '-',
            client_contact_person: (client as any)?.contact_person || '-',
            value: deal.amount,
            owner_id: deal.owner_id,
            owner_name: owner ? `${(owner as any).first_name} ${(owner as any).last_name}` : '-',
            pm_assigned_id: deal.pm_assigned_id,
            pm_assigned_name: pm ? `${(pm as any).first_name} ${(pm as any).last_name}` : '-',
            stage: deal.stage,
            status: deal.status,
            dealtype: deal.dealtype,
            category: deal.category,
            close_date: deal.close_date,
            created_at: deal.created_at,
            updated_at: deal.updated_at,
            pod_name: (deal as any).pods?.name || '-',
            control_tower_id: deal.control_tower_id,
            synced_from_control_tower: deal.synced_from_control_tower,
            lead_source: deal.lead_source || '-',
            hubspot_crm_deal_url: deal.control_tower_id ? `https://app.hubspot.com/contacts/deal/${deal.control_tower_id}` : null,
            deal_files: deal.deal_files || [],
            slug: deal.slug,
          };
        });
        
        setData({
          data: deals,
          total: count || 0,
        });
      } catch (error) {
        console.error('Error fetching all deals:', error);
        toast.error('Failed to load deals');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id, page, limit, filters]);

  const refetch = () => {
    // Trigger re-fetch by updating a dependency
    setIsLoading(true);
  };

  return { data, isLoading, refetch };
}

// Hook to get total deal count for navigation
export function useTotalDealCount() {
  const [count, setCount] = useState<number | null>(null);
  
  useEffect(() => {
    const fetchCount = async () => {
      const { count, error } = await supabase
        .from('deals')
        .select('*', { count: 'exact', head: true });
      
      if (!error && count !== null) {
        setCount(count);
      }
    };
    
    fetchCount();
  }, []);
  
  return count;
}

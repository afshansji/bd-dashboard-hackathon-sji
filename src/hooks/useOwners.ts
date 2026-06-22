import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const ownerKeys = {
  all: ['hubspot-owners'] as const,
  list: () => [...ownerKeys.all, 'list'] as const,
};

interface HubSpotOwner {
  id: string;
  hubspot_owner_id: string;
  owner_email: string | null;
  owner_first_name: string | null;
  owner_last_name: string | null;
  owner_full_name: string | null;
  is_active: boolean;
  teams: string[];
  last_synced_at: string;
}

export function useHubSpotOwners() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ownerKeys.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hubspot_owners')
        .select('*')
        .eq('is_active', true)
        .order('owner_full_name');

      if (error) throw error;
      return data as HubSpotOwner[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOwnerLookup(ownerId: string | null | undefined) {
  const { data: owners } = useHubSpotOwners();

  if (!ownerId || !owners) {
    return { name: ownerId || 'Unassigned', email: null };
  }

  const owner = owners.find(o => o.hubspot_owner_id === ownerId);

  return {
    name: owner?.owner_full_name || ownerId,
    email: owner?.owner_email || null,
  };
}

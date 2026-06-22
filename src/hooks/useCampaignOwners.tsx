import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CampaignOwner {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  role: string;
}

export function useCampaignOwners() {
  return useQuery({
    queryKey: ['campaign-owners'],
    queryFn: async () => {
      // Step 1: Fetch users with allowed roles from user_roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['super_admin', 'admin', 'manager']);

      const userIds = Array.from(new Set((rolesData ?? []).map((r: any) => r.user_id).filter(Boolean)));

      // If roles not accessible or none found, fallback to all profiles
      if (rolesError || userIds.length === 0) {
        const { data: profilesAll, error: profilesAllError } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .order('full_name')
          .limit(100);

        if (profilesAllError) {
          throw new Error(profilesAllError.message);
        }

        return (profilesAll ?? []).map((owner: any) => ({
          id: owner.id,
          full_name: owner.full_name || owner.email,
          email: owner.email,
          avatar_url: owner.avatar_url,
          role: 'unknown',
        })) as CampaignOwner[];
      }

      // Step 2: Fetch profiles for those users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds)
        .order('full_name');

      if (profilesError) {
        throw new Error(profilesError.message);
      }

      // Map highest-precedence role per user
      const precedence: Record<string, number> = { super_admin: 3, admin: 2, manager: 1 };
      const roleMap = new Map<string, string>();
      for (const r of rolesData ?? []) {
        const uid = (r as any).user_id as string;
        const role = (r as any).role as string;
        const current = roleMap.get(uid);
        if (!current || precedence[role] > precedence[current]) {
          roleMap.set(uid, role);
        }
      }

      return (profiles ?? []).map((owner: any) => ({
        id: owner.id,
        full_name: owner.full_name || owner.email,
        email: owner.email,
        avatar_url: owner.avatar_url,
        role: roleMap.get(owner.id) || 'unknown',
      })) as CampaignOwner[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

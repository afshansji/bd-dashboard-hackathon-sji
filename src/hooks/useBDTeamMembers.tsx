import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BDTeamMember {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  role: string;
}

export function useBDTeamMembers() {
  return useQuery({
    queryKey: ['bd-team-members'],
    queryFn: async () => {
      try {
        console.log('Fetching team members...');

        // Fetch all users from profiles table (without user_roles to avoid relationship errors)
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .order('full_name');

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
        }

        if (!profilesData) {
          console.warn('No profiles data returned - data is null');
          return [];
        }

        console.log(`Fetched ${profilesData.length} profiles`);

        if (profilesData.length === 0) {
          console.warn('No users found in profiles table');
          return [];
        }

        // Try to fetch roles separately if the table exists
        let rolesMap: Record<string, string> = {};
        try {
          const { data: rolesData, error: rolesError } = await supabase
            .from('user_roles')
            .select('user_id, role');

          if (!rolesError && rolesData) {
            rolesMap = rolesData.reduce((acc, r: any) => {
              acc[r.user_id] = r.role;
              return acc;
            }, {} as Record<string, string>);
            console.log(`Fetched roles for ${Object.keys(rolesMap).length} users`);
          } else if (rolesError) {
            console.warn('Could not fetch user roles:', rolesError.message);
          }
        } catch (roleError) {
          console.warn('user_roles table not available, assigning default role');
        }

        const members = profilesData.map((member: any) => ({
          id: member.id,
          full_name: member.full_name || member.email || 'Unknown User',
          email: member.email,
          avatar_url: member.avatar_url,
          role: rolesMap[member.id] || 'team_member',
        })) as BDTeamMember[];

        console.log(`Successfully prepared ${members.length} team members for assignee dropdown`);
        return members;
      } catch (error: any) {
        console.error('Failed to fetch team members:', error);
        throw new Error(error.message || 'Failed to load users');
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2, // Retry failed requests twice
    retryDelay: 1000, // Wait 1 second between retries
  });
}

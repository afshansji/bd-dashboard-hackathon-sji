import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PMContactInfo {
  full_name: string;
  email: string | null;
  phone: string | null;
  source: 'local_user' | 'control_tower';
}

export const usePMContactInfo = (userId?: string | null, controlTowerId?: string | null) => {
  return useQuery({
    queryKey: ['pm-contact-info', userId, controlTowerId],
    queryFn: async (): Promise<PMContactInfo | null> => {
      // Try local users table first
      if (userId) {
        const { data: user } = await supabase
          .from('users')
          .select('id, first_name, last_name, email')
          .eq('id', userId)
          .maybeSingle();

        if (user) {
          return {
            full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
            email: user.email,
            phone: null, // users table doesn't have phone
            source: 'local_user'
          };
        }
      }

      // Fallback to employees table via Control Tower ID (using rpc to avoid type issues)
      if (controlTowerId) {
        const { data, error } = await supabase.rpc('get_employee_by_ct_id', {
          ct_id: controlTowerId
        });

        if (!error && data && data.length > 0) {
          const employee = data[0];
          return {
            full_name: employee.full_name,
            email: employee.email,
            phone: employee.phone,
            source: 'control_tower'
          };
        }
      }

      return null;
    },
    enabled: !!(userId || controlTowerId)
  });
};

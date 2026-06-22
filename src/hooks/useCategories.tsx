import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useCategories() {
  return useQuery({
    queryKey: ['deal-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('category')
        .not('category', 'is', null)
        .order('category');
      
      if (error) throw error;
      
      // Get unique categories
      const uniqueCategories = [...new Set(data?.map(d => d.category).filter(Boolean))];
      return uniqueCategories as string[];
    },
  });
}

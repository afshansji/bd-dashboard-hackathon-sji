import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AccountabilityItem {
  id: string;
  user_id: string;
  serial_number: number;
  type_of_work: string;
  responsibilities: string;
  created_at: string;
  updated_at: string;
}

export const useAccountabilityChart = (userId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch accountability chart
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['accountability-chart', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('user_accountability_chart')
        .select('*')
        .eq('user_id', userId)
        .order('serial_number', { ascending: true });
      
      if (error) throw error;
      return data as AccountabilityItem[];
    },
    enabled: !!userId,
  });

  // Add or update item
  const saveItemMutation = useMutation({
    mutationFn: async (item: Partial<AccountabilityItem>) => {
      if (item.id) {
        // Update existing
        const { data, error } = await supabase
          .from('user_accountability_chart')
          .update({
            type_of_work: item.type_of_work,
            responsibilities: item.responsibilities,
            serial_number: item.serial_number,
          })
          .eq('id', item.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('user_accountability_chart')
          .insert({
            user_id: userId!,
            type_of_work: item.type_of_work!,
            responsibilities: item.responsibilities!,
            serial_number: item.serial_number!,
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accountability-chart', userId] });
      toast({
        title: 'Success',
        description: 'Accountability item saved successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save accountability item',
        variant: 'destructive',
      });
    },
  });

  // Delete item
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('user_accountability_chart')
        .delete()
        .eq('id', itemId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accountability-chart', userId] });
      toast({
        title: 'Success',
        description: 'Accountability item deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete accountability item',
        variant: 'destructive',
      });
    },
  });

  return {
    items,
    isLoading,
    saveItem: saveItemMutation.mutate,
    deleteItem: deleteItemMutation.mutate,
    isSaving: saveItemMutation.isPending,
    isDeleting: deleteItemMutation.isPending,
  };
};

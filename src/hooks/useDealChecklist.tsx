import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface ChecklistItem {
  id: string;
  deal_id: string;
  title: string;
  is_completed: boolean;
  completed_by?: string;
  completed_at?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
  control_tower_synced_at?: string | null;
  completed_user?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export const useDealChecklist = (dealId: string) => {
  return useQuery({
    queryKey: ["deal-checklist", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_checklist_items")
        .select(`
          *,
          completed_user:users!deal_checklist_items_completed_by_fkey(id, first_name, last_name)
        `)
        .eq("deal_id", dealId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data as ChecklistItem[];
    },
    enabled: !!dealId,
  });
};

export const useAddChecklistItem = (dealId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (title: string) => {
      // Get max order_index
      const { data: items } = await supabase
        .from("deal_checklist_items")
        .select("order_index")
        .eq("deal_id", dealId)
        .order("order_index", { ascending: false })
        .limit(1);

      const nextOrderIndex = items && items.length > 0 ? items[0].order_index + 1 : 0;

      const { data, error } = await supabase
        .from("deal_checklist_items")
        .insert({
          deal_id: dealId,
          title,
          order_index: nextOrderIndex,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-checklist", dealId] });
      toast({
        title: "Item added",
        description: "Checklist item has been added.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add checklist item.",
        variant: "destructive",
      });
      console.error("Error adding checklist item:", error);
    },
  });
};

export const useToggleChecklistItem = (dealId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, isCompleted }: { itemId: string; isCompleted: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updateData: any = {
        is_completed: !isCompleted,
      };

      if (!isCompleted) {
        updateData.completed_by = user?.id;
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_by = null;
        updateData.completed_at = null;
      }

      const { error } = await supabase
        .from("deal_checklist_items")
        .update(updateData)
        .eq("id", itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-checklist", dealId] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update checklist item.",
        variant: "destructive",
      });
      console.error("Error toggling checklist item:", error);
    },
  });
};

export const useDeleteChecklistItem = (dealId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("deal_checklist_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-checklist", dealId] });
      toast({
        title: "Item deleted",
        description: "Checklist item has been removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete checklist item.",
        variant: "destructive",
      });
      console.error("Error deleting checklist item:", error);
    },
  });
};

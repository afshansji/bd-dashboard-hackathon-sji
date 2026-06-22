import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DealSystemInfo {
  id: string;
  deal_id: string;
  slug: string;
  external_references?: any;
  created_at: string;
  updated_at: string;
}

const generateSlug = (dealTitle: string): string => {
  const kebabCase = dealTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${kebabCase}-${randomSuffix}`;
};

export const useDealSystemInfo = (dealId: string, dealTitle?: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["deal-system-info", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_system_info")
        .select("*")
        .eq("deal_id", dealId)
        .maybeSingle();

      if (error) throw error;
      return data as DealSystemInfo | null;
    },
    enabled: !!dealId,
  });

  // Auto-create system info if it doesn't exist
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!dealTitle) throw new Error("Deal title is required");

      const slug = generateSlug(dealTitle);

      const { data, error } = await supabase
        .from("deal_system_info")
        .insert({
          deal_id: dealId,
          slug,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-system-info", dealId] });
    },
  });

  // Auto-create if data is null and dealTitle is provided
  if (query.data === null && dealTitle && !createMutation.isPending) {
    createMutation.mutate();
  }

  return {
    ...query,
    createSystemInfo: createMutation.mutate,
  };
};

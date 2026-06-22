import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useClientBySlug = (slug: string | undefined) => {
  return useQuery({
    queryKey: ["client-by-slug", slug],
    queryFn: async () => {
      if (!slug) throw new Error("Slug is required");
      
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Client not found");
      return data;
    },
    enabled: !!slug,
  });
};

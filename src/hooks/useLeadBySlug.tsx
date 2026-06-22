import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useLeadBySlug = (slug: string | undefined) => {
  return useQuery({
    queryKey: ["lead-by-slug", slug],
    queryFn: async () => {
      if (!slug) throw new Error("Slug is required");
      
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Lead not found");
      return data;
    },
    enabled: !!slug,
  });
};

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const useDealBySlug = (slug: string | undefined) => {
  // First, resolve the slug to a deal_id
  const { data: systemInfo, isLoading: isLoadingSlug } = useQuery({
    queryKey: ["deal-slug-lookup", slug],
    queryFn: async () => {
      if (!slug) throw new Error("Slug is required");

      // Check if slug is already a UUID (legacy format)
      if (isValidUUID(slug)) {
        return { deal_id: slug };
      }

      // Check if it's a compound slug (readable-slug-full-uuid)
      const parts = slug.split("-");
      if (parts.length >= 5) {
        const potentialUuid = parts.slice(-5).join("-");
        
        if (isValidUUID(potentialUuid)) {
          // First check if this UUID exists in deal_system_info
          const { data: systemData, error: systemError } = await supabase
            .from("deal_system_info")
            .select("deal_id")
            .eq("deal_id", potentialUuid)
            .maybeSingle();

          if (systemData) {
            return { deal_id: systemData.deal_id };
          }

          // Fallback to direct UUID if not in system_info
          return { deal_id: potentialUuid };
        }
      }

      // Try deal_system_info first
      const { data: sysData } = await supabase
        .from("deal_system_info")
        .select("deal_id")
        .eq("slug", slug)
        .maybeSingle();

      if (sysData) return sysData;

      // Fallback: look up directly in deals table by slug
      const { data: dealData, error: dealError } = await supabase
        .from("deals")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (dealError) throw dealError;
      if (!dealData) throw new Error("Deal not found");
      
      return { deal_id: dealData.id };
    },
    enabled: !!slug,
  });

  // Once we have the deal_id, fetch the full deal data
  const { data: deal, isLoading: isLoadingDeal, error } = useQuery({
    queryKey: ["deal", systemInfo?.deal_id],
    queryFn: async () => {
      if (!systemInfo?.deal_id) throw new Error("Deal ID not resolved");

      const { data, error } = await supabase
        .from("deals")
        .select(`
          *,
          pods(id, name),
          clients(*)
        `)
        .eq("id", systemInfo.deal_id)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Deal not found");
      
      return data;
    },
    enabled: !!systemInfo?.deal_id,
  });

  return {
    deal,
    isLoading: isLoadingSlug || isLoadingDeal,
    error,
    dealId: systemInfo?.deal_id,
  };
};


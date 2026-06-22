import { useQuery } from "@tanstack/react-query";
import axiosPrivate from "@/lib/axiosPrivate";
import type { CampaignDetailResponse } from '@/Api/adminCampaigns';

export const useCampaignBySlug = (slug: string | undefined) => {
  return useQuery({
    queryKey: ["campaign-by-slug", slug],
    queryFn: async () => {
      if (!slug) throw new Error("Slug is required");
      
      const { data } = await axiosPrivate.get<CampaignDetailResponse>(
        `/admin-campaigns/${slug}`
      );
      
      return data;
    },
    enabled: !!slug,
  });
};

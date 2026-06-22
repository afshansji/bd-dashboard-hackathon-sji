import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CampaignTag {
  id: string;
  campaign_id: string;
  tag_name: string;
  color: string;
  usage_count: number;
  created_at?: string;
  created_by?: string;
}

const TAG_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#6366F1',
  '#84CC16', '#A855F7', '#F43F5E', '#22D3EE', '#EAB308',
  '#10B981', '#6366F1', '#F59E0B', '#EC4899', '#8B5CF6'
];

export const useCampaignTags = (campaignId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ["campaign-tags", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_tags" as any)
        .select("*")
        .eq("campaign_id", campaignId)
        .order("usage_count", { ascending: false });

      if (error) throw error;
      return data as unknown as CampaignTag[];
    },
    enabled: !!campaignId,
  });

  const createTagMutation = useMutation({
    mutationFn: async (tagName: string) => {
      // Check if tag already exists
      const existing = tags.find(t => t.tag_name.toLowerCase() === tagName.toLowerCase());
      if (existing) return existing;

      // Auto-assign color (round-robin)
      const colorIndex = tags.length % TAG_COLORS.length;
      const color = TAG_COLORS[colorIndex];

      const { data, error } = await supabase
        .from("campaign_tags" as any)
        .insert({
          campaign_id: campaignId,
          tag_name: tagName,
          color,
          usage_count: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as CampaignTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-tags", campaignId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const incrementUsageMutation = useMutation({
    mutationFn: async (tagName: string) => {
      const tag = tags.find(t => t.tag_name === tagName);
      if (!tag) return;

      const { error } = await supabase
        .from("campaign_tags" as any)
        .update({ usage_count: tag.usage_count + 1 })
        .eq("id", tag.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-tags", campaignId] });
    },
  });

  const decrementUsageMutation = useMutation({
    mutationFn: async (tagName: string) => {
      const tag = tags.find(t => t.tag_name === tagName);
      if (!tag || tag.usage_count === 0) return;

      const { error } = await supabase
        .from("campaign_tags" as any)
        .update({ usage_count: Math.max(0, tag.usage_count - 1) })
        .eq("id", tag.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-tags", campaignId] });
    },
  });

  const getTagColor = (tagName: string): string => {
    const tag = tags.find(t => t.tag_name === tagName);
    return tag?.color || TAG_COLORS[0];
  };

  const ensureTagExists = async (tagName: string): Promise<CampaignTag> => {
    const existing = tags.find(t => t.tag_name.toLowerCase() === tagName.toLowerCase());
    if (existing) return existing;
    
    return await createTagMutation.mutateAsync(tagName);
  };

  return {
    tags,
    isLoading,
    createTag: createTagMutation.mutateAsync,
    incrementUsage: incrementUsageMutation.mutateAsync,
    decrementUsage: decrementUsageMutation.mutateAsync,
    getTagColor,
    ensureTagExists,
  };
};

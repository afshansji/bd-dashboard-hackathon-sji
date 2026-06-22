import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FeatureFlagName =
  | "feedback_enabled"
  | "feedback_auto_email"
  | "feedback_widget";

type FeatureFlagRecord = Record<string, boolean>;

interface FeatureFlagsResult {
  flags: FeatureFlagRecord;
}

async function fetchFeatureFlags(): Promise<FeatureFlagsResult> {
  const { data, error } = await supabase
    .from("ai_configurations")
    .select("configuration_data")
    .eq("configuration_type", "feature_flags");

  if (error) {
    if (error.code === "42501") {
      return { flags: {} };
    }

    throw error;
  }

  const aggregatedFlags = (data ?? []).reduce<FeatureFlagRecord>((acc, entry) => {
    const configuration = (entry?.configuration_data as FeatureFlagRecord) ?? {};

    Object.entries(configuration).forEach(([key, value]) => {
      if (typeof value === "boolean") {
        acc[key] = value;
      }
    });

    return acc;
  }, {});

  return { flags: aggregatedFlags };
}

export function useFeatureFlags() {
  return useQuery({
    queryKey: ["feature-flags"],
    queryFn: fetchFeatureFlags,
    staleTime: 1000 * 60 * 5,
  });
}

export function useFeatureFlag(flag: FeatureFlagName, defaultValue = false) {
  const { data, isLoading, isError } = useFeatureFlags();

  const enabled = data?.flags?.[flag];

  return {
    enabled: typeof enabled === "boolean" ? enabled : defaultValue,
    isLoading,
    isError,
  };
}

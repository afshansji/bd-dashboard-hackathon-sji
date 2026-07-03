import type { ProjectProfile } from "../graph/types.js";
import type { QueryFilters } from "../graph/types.js";
import { getSupabase, isSupabaseConfigured } from "./supabase.js";

export async function loadProjectProfiles(
  candidateRepoIds: string[],
  filters?: QueryFilters,
): Promise<ProjectProfile[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = getSupabase();
  let query = supabase
    .from("org_projects")
    .select("id, name, summary, tech_stack, domain_tags, profile, repository_id")
    .order("updated_at", { ascending: false });

  if (filters?.projectIds?.length) {
    query = query.in("id", filters.projectIds);
  } else if (candidateRepoIds.length > 0) {
    query = query.in("repository_id", candidateRepoIds);
  }

  const { data, error } = await query.limit(20);
  if (error) throw error;

  return (data ?? []).map((row) => {
    const profile = (row.profile ?? {}) as Record<string, unknown>;
    return {
      id: row.id,
      name: row.name,
      summary: row.summary ?? (profile.summary as string) ?? "",
      techStack: row.tech_stack ?? (profile.techStack as string[]) ?? [],
      domainTags: row.domain_tags ?? (profile.domainTags as string[]) ?? [],
      keyFeatures: (profile.keyFeatures as string[]) ?? [],
    };
  });
}

import type { QueryFilters } from "../graph/types.js";
import { extractQueryTerms } from "../ingestion/chunker.js";
import { getSupabase, isSupabaseConfigured } from "./supabase.js";

export interface DiscoveredRepo {
  id: string;
  name: string;
  url: string;
  score: number;
  matchedSignals: string[];
}

export async function discoverRepositories(
  query: string,
  filters?: QueryFilters,
  maxRepos = 10,
  vectorRepoScores?: Map<string, number>,
): Promise<DiscoveredRepo[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = getSupabase();
  const terms = extractQueryTerms(query);

  let repoQuery = supabase
    .from("org_repositories")
    .select(
      "id, name, url, tags, index_status, org_projects(id, name, summary, tech_stack, domain_tags)",
    )
    .eq("is_active", true);

  if (filters?.repoIds?.length) {
    repoQuery = repoQuery.in("id", filters.repoIds);
  }

  const { data, error } = await repoQuery;
  if (error) throw error;

  const scored: DiscoveredRepo[] = [];

  for (const repo of data ?? []) {
    const projects = (repo.org_projects ?? []) as Array<{
      summary?: string;
      tech_stack?: string[];
      domain_tags?: string[];
    }>;

    const signals: string[] = [];
    let score =
      repo.index_status === "success"
        ? 0.35
        : repo.index_status === "failed"
        ? 0.1
        : 0.2;

    const haystack = [
      repo.name,
      ...(repo.tags ?? []),
      ...projects.flatMap((p) => [
        p.summary ?? "",
        ...(p.tech_stack ?? []),
        ...(p.domain_tags ?? []),
      ]),
    ]
      .join(" ")
      .toLowerCase();

    for (const term of terms) {
      if (haystack.includes(term)) {
        score += 0.25;
        signals.push(term);
      }
    }

    if (filters?.techStack?.length) {
      const techs = projects.flatMap((p) => p.tech_stack ?? []).map((t) => t.toLowerCase());
      for (const tech of filters.techStack) {
        if (techs.some((t) => t.includes(tech.toLowerCase()))) {
          score += 0.3;
          signals.push(tech);
        }
      }
    }

    if (filters?.industry) {
      const industry = filters.industry.toLowerCase();
      const tags = [
        ...(repo.tags ?? []),
        ...projects.flatMap((p) => p.domain_tags ?? []),
      ].map((t) => t.toLowerCase());
      if (tags.some((t) => t.includes(industry))) {
        score += 0.35;
        signals.push(filters.industry);
      }
    }

    const vectorScore = vectorRepoScores?.get(repo.id) ?? 0;
    if (vectorScore > 0) {
      score += vectorScore * 0.65;
      signals.push("semantic_match");
    }

    if (score >= 0.1 || terms.length === 0) {
      scored.push({
        id: repo.id,
        name: repo.name,
        url: repo.url,
        score: Math.min(score, 1),
        matchedSignals: [...new Set(signals)],
      });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxRepos);
}

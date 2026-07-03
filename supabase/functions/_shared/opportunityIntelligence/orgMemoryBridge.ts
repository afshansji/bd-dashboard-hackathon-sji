import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type {
  OrgCitationEvidence,
  OrgProjectEvidence,
  OrgRepoEvidence,
} from "./types.ts";

function mapProjectRow(row: Record<string, unknown>): OrgProjectEvidence {
  const profile = (row.profile ?? {}) as Record<string, unknown>;
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    summary: String(row.summary ?? (profile.summary as string) ?? ""),
    techStack: Array.isArray(row.tech_stack)
      ? row.tech_stack.map(String)
      : Array.isArray(profile.techStack)
      ? (profile.techStack as string[]).map(String)
      : [],
    domainTags: Array.isArray(row.domain_tags)
      ? row.domain_tags.map(String)
      : Array.isArray(profile.domainTags)
      ? (profile.domainTags as string[]).map(String)
      : [],
    keyFeatures: Array.isArray(profile.keyFeatures)
      ? (profile.keyFeatures as string[]).map(String)
      : [],
    repositoryId: row.repository_id
      ? String(row.repository_id)
      : undefined,
  };
}

/** Load the full indexed org corpus for capability evidence scanning. */
export async function fetchIndexedOrgCorpus(
  client: SupabaseClient,
  limit = 500,
): Promise<{
  projects: OrgProjectEvidence[];
  repos: OrgRepoEvidence[];
  totalIndexedRepos: number;
}> {
  const { data: repoRows, error: repoError } = await client
    .from("org_repositories")
    .select("id, name, url, index_status")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (repoError) throw repoError;

  const repos: OrgRepoEvidence[] = (repoRows ?? []).map((repo) => ({
    id: String(repo.id ?? ""),
    name: String(repo.name ?? ""),
    url: String(repo.url ?? ""),
    indexStatus: repo.index_status ? String(repo.index_status) : undefined,
  }));

  if (repos.length === 0) {
    return { projects: [], repos: [], totalIndexedRepos: 0 };
  }

  const projects: OrgProjectEvidence[] = [];
  const repoIds = repos.map((repo) => repo.id);
  const PROJECT_FETCH_CHUNK = 80;

  for (let offset = 0; offset < repoIds.length; offset += PROJECT_FETCH_CHUNK) {
    const chunk = repoIds.slice(offset, offset + PROJECT_FETCH_CHUNK);
    const { data: projectRows, error: projectError } = await client
      .from("org_projects")
      .select("id, name, summary, tech_stack, domain_tags, profile, repository_id")
      .in("repository_id", chunk);

    if (projectError) throw projectError;

    for (const row of projectRows ?? []) {
      projects.push(mapProjectRow(row as Record<string, unknown>));
    }
  }

  return {
    projects,
    repos,
    totalIndexedRepos: repos.length,
  };
}

export function mapOrgMemoryResult(result: Record<string, unknown>): {
  projects: OrgProjectEvidence[];
  repos: OrgRepoEvidence[];
  citations: OrgCitationEvidence[];
} {
  const discovery = result.discovery as
    | { repos?: Array<Record<string, unknown>> }
    | undefined;
  const projectsRaw = (result.projects ?? []) as Array<Record<string, unknown>>;
  const answer = result.answer as
    | { citations?: Array<Record<string, unknown>> }
    | undefined;

  const repos: OrgRepoEvidence[] = (discovery?.repos ?? []).map((repo) => ({
    id: String(repo.id ?? ""),
    name: String(repo.name ?? ""),
    url: String(repo.url ?? ""),
    indexStatus: repo.indexStatus ? String(repo.indexStatus) : undefined,
  }));

  const projects: OrgProjectEvidence[] = projectsRaw.map((project) => ({
    id: String(project.id ?? ""),
    name: String(project.name ?? ""),
    summary: String(project.summary ?? ""),
    techStack: Array.isArray(project.techStack)
      ? project.techStack.map(String)
      : [],
    domainTags: Array.isArray(project.domainTags)
      ? project.domainTags.map(String)
      : [],
    keyFeatures: Array.isArray(project.keyFeatures)
      ? project.keyFeatures.map(String)
      : [],
    repositoryId: project.repositoryId
      ? String(project.repositoryId)
      : project.repository_id
      ? String(project.repository_id)
      : undefined,
  }));

  const citations: OrgCitationEvidence[] = (answer?.citations ?? []).map(
    (citation) => ({
      chunkId: String(citation.chunkId ?? ""),
      repositoryId: String(citation.repositoryId ?? ""),
      sourcePath: String(citation.sourcePath ?? ""),
      excerpt: String(citation.excerpt ?? ""),
    }),
  );

  return { projects, repos, citations };
}

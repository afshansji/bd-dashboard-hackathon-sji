import type { Citation, KnowledgeChunk } from "../graph/types.js";
import type { QueryFilters } from "../graph/types.js";
import { extractQueryTerms } from "../ingestion/chunker.js";
import { embedText } from "../ingestion/embeddings.js";
import { getSupabase, isSupabaseConfigured } from "./supabase.js";

export interface RetrievalResult {
  chunks: KnowledgeChunk[];
  answer: string;
  citations: Citation[];
  confidence: number;
}

export async function retrieveKnowledge(
  query: string,
  filters?: QueryFilters,
  maxChunks = 10,
  options?: { searchAllRepos?: boolean },
): Promise<RetrievalResult> {
  if (!isSupabaseConfigured()) {
    return {
      chunks: [],
      answer: "Database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      citations: [],
      confidence: 0,
    };
  }

  const supabase = getSupabase();
  const searchAllRepos =
    options?.searchAllRepos ?? !filters?.repoIds?.length;
  const repositoryIds = searchAllRepos ? undefined : filters?.repoIds;
  const vectorMatchCount = searchAllRepos
    ? Math.min(60, maxChunks * 4)
    : maxChunks;
  let chunks: KnowledgeChunk[] = [];

  const queryEmbedding = await embedText(query);

  if (queryEmbedding?.length) {
    const { data: vectorHits, error: vectorError } = await supabase.rpc(
      "search_org_knowledge_chunks",
      {
        p_embedding: queryEmbedding,
        p_match_count: vectorMatchCount,
        p_repository_ids: repositoryIds?.length ? repositoryIds : null,
        p_similarity_threshold: searchAllRepos ? 0.22 : 0.25,
      },
    );

    if (!vectorError && vectorHits) {
      chunks = (vectorHits as Array<{
        id: string;
        repository_id: string;
        project_id: string | null;
        source_path: string;
        content: string;
        similarity: number;
      }>).map((hit) => ({
        id: hit.id,
        repositoryId: hit.repository_id,
        projectId: hit.project_id ?? undefined,
        sourcePath: hit.source_path,
        excerpt: hit.content.slice(0, 400),
        score: hit.similarity,
      }));
    }
  }

  if (chunks.length === 0) {
    const terms = extractQueryTerms(query);
    let keywordQuery = supabase
      .from("org_knowledge_chunks")
      .select("id, repository_id, project_id, source_path, content")
      .limit(maxChunks);

    if (repositoryIds?.length) {
      keywordQuery = keywordQuery.in("repository_id", repositoryIds);
    }

    if (terms.length > 0) {
      const orFilter = terms
        .slice(0, 8)
        .map((t) => `content.ilike.%${t}%`)
        .join(",");
      keywordQuery = keywordQuery.or(orFilter);
    }

    const { data: keywordHits, error: keywordError } = await keywordQuery;
    if (keywordError) throw keywordError;

    chunks = (keywordHits ?? []).map((hit) => ({
      id: hit.id,
      repositoryId: hit.repository_id,
      projectId: hit.project_id ?? undefined,
      sourcePath: hit.source_path,
      excerpt: hit.content.slice(0, 400),
      score: 0.5,
    }));
  }

  if (chunks.length === 0) {
    return {
      chunks: [],
      answer:
        "No indexed knowledge matched your query. Register a GitHub repository and run indexing first.",
      citations: [],
      confidence: 0,
    };
  }

  const citations: Citation[] = chunks.slice(0, maxChunks).map((c) => ({
    chunkId: c.id,
    repositoryId: c.repositoryId,
    sourcePath: c.sourcePath,
    excerpt: c.excerpt,
  }));

  const answerParts = citations.map(
    (c, i) => `[${i + 1}] ${c.sourcePath}: ${c.excerpt}`,
  );

  const avgScore =
    chunks.reduce((sum, c) => sum + (c.score ?? 0), 0) / chunks.length;

  return {
    chunks,
    answer: `Based on indexed repository knowledge:\n\n${answerParts.join("\n\n")}`,
    citations,
    confidence: Math.min(Math.max(avgScore, 0.3), 0.95),
  };
}

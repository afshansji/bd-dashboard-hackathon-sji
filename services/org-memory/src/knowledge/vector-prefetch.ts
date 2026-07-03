import type { KnowledgeChunk } from "../graph/types.js";
import { embedText } from "../ingestion/embeddings.js";
import { getSupabase, isSupabaseConfigured } from "./supabase.js";

export function aggregateRepoScoresFromChunks(
  chunks: KnowledgeChunk[],
): Map<string, number> {
  const scores = new Map<string, number>();
  for (const chunk of chunks) {
    const current = scores.get(chunk.repositoryId) ?? 0;
    const score = chunk.score ?? 0;
    if (score > current) {
      scores.set(chunk.repositoryId, score);
    }
  }
  return scores;
}

export async function prefetchGlobalVectorChunks(
  query: string,
  maxChunks: number,
): Promise<KnowledgeChunk[]> {
  if (!isSupabaseConfigured()) return [];

  const embedding = await embedText(query);
  if (!embedding?.length) return [];

  const supabase = getSupabase();
  const { data: vectorHits, error } = await supabase.rpc(
    "search_org_knowledge_chunks",
    {
      p_embedding: embedding,
      p_match_count: Math.min(60, maxChunks * 4),
      p_repository_ids: null,
      p_similarity_threshold: 0.22,
    },
  );

  if (error || !vectorHits) return [];

  return (vectorHits as Array<{
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

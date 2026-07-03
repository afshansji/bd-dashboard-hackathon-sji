-- Vector + keyword search helpers for org knowledge chunks

CREATE OR REPLACE FUNCTION public.search_org_knowledge_chunks(
  p_embedding vector(1536),
  p_match_count int DEFAULT 10,
  p_repository_ids uuid[] DEFAULT NULL,
  p_similarity_threshold float DEFAULT 0.3
)
RETURNS TABLE (
  id uuid,
  repository_id uuid,
  project_id uuid,
  source_path text,
  content text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.repository_id,
    c.project_id,
    c.source_path,
    c.content,
    (1 - (c.embedding <=> p_embedding))::float AS similarity
  FROM public.org_knowledge_chunks c
  INNER JOIN public.org_repositories r ON r.id = c.repository_id
  WHERE c.embedding IS NOT NULL
    AND r.is_active = true
    AND (1 - (c.embedding <=> p_embedding)) >= p_similarity_threshold
    AND (p_repository_ids IS NULL OR c.repository_id = ANY(p_repository_ids))
  ORDER BY c.embedding <=> p_embedding
  LIMIT p_match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_org_knowledge_chunks(vector(1536), int, uuid[], float) TO service_role;

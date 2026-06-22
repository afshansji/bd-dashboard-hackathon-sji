-- AI Chat Memory System: agent_memories table + pgvector + DB functions
-- See docs/ai-chat-memory-system.md

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL DEFAULT 'short_term' CHECK (memory_type IN ('short_term', 'long_term', 'episodic', 'semantic')),
  memory_category TEXT CHECK (memory_category IN ('fact', 'preference', 'summary', 'decision', 'pattern')),
  content TEXT NOT NULL,
  summary TEXT,
  embedding vector(1536),
  source_type TEXT DEFAULT 'conversation',
  source_id UUID,
  importance_score FLOAT DEFAULT 0.5 CHECK (importance_score >= 0 AND importance_score <= 1),
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  consolidated BOOLEAN DEFAULT false,
  superseded_by UUID REFERENCES public.agent_memories(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_memories_agent_user ON public.agent_memories(agent_id, user_id);
CREATE INDEX IF NOT EXISTS idx_agent_memories_active ON public.agent_memories(agent_id, user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_agent_memories_created ON public.agent_memories(agent_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_memories_embedding ON public.agent_memories
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE public.agent_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memories" ON public.agent_memories FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role manages memories" ON public.agent_memories FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_agent_memories_updated_at BEFORE UPDATE ON public.agent_memories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vector similarity search: returns memories ordered by cosine similarity + importance + recency
CREATE OR REPLACE FUNCTION public.get_relevant_memories(
  p_agent_id UUID,
  p_user_id UUID,
  p_embedding vector(1536),
  p_limit INT DEFAULT 5,
  p_similarity_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  memory_category TEXT,
  importance_score FLOAT,
  similarity FLOAT,
  created_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.memory_category,
    m.importance_score,
    1 - (m.embedding <=> p_embedding) AS similarity,
    m.created_at
  FROM public.agent_memories m
  WHERE m.agent_id = p_agent_id
    AND m.user_id = p_user_id
    AND m.is_active = true
    AND m.embedding IS NOT NULL
    AND (1 - (m.embedding <=> p_embedding)) >= p_similarity_threshold
  ORDER BY (1 - (m.embedding <=> p_embedding)) DESC, m.importance_score DESC, m.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Increment access count and last_accessed_at for given memory IDs
CREATE OR REPLACE FUNCTION public.increment_memory_access(memory_ids UUID[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.agent_memories
  SET access_count = access_count + 1, last_accessed_at = now(), updated_at = now()
  WHERE id = ANY(memory_ids);
END;
$$;

-- Promote old short_term memories that have been accessed to long_term
CREATE OR REPLACE FUNCTION public.consolidate_short_term_memories(
  p_agent_id UUID,
  p_user_id UUID,
  p_days_old INT DEFAULT 7
)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE updated_count INT;
BEGIN
  WITH updated AS (
    UPDATE public.agent_memories
    SET memory_type = 'long_term', consolidated = true, updated_at = now()
    WHERE agent_id = p_agent_id AND user_id = p_user_id
      AND memory_type = 'short_term'
      AND created_at < now() - (p_days_old || ' days')::interval
      AND (access_count > 0 OR importance_score >= 0.3)
    RETURNING id
  )
  SELECT count(*)::INT INTO updated_count FROM updated;
  RETURN updated_count;
END;
$$;

-- Soft-delete stale short_term memories that were never useful
CREATE OR REPLACE FUNCTION public.prune_short_term_memories(
  p_agent_id UUID,
  p_user_id UUID,
  p_days_old INT DEFAULT 30,
  p_importance_threshold FLOAT DEFAULT 0.2
)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE updated_count INT;
BEGIN
  WITH updated AS (
    UPDATE public.agent_memories
    SET is_active = false, updated_at = now()
    WHERE agent_id = p_agent_id AND user_id = p_user_id
      AND memory_type = 'short_term'
      AND created_at < now() - (p_days_old || ' days')::interval
      AND importance_score < p_importance_threshold
      AND (access_count = 0 OR access_count IS NULL)
    RETURNING id
  )
  SELECT count(*)::INT INTO updated_count FROM updated;
  RETURN updated_count;
END;
$$;

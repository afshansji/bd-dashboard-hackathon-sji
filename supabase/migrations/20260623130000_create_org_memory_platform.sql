-- Migration: Organizational Memory Platform (Phase 0)
-- See docs/06-ai-features/org-memory-platform.md

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- org_repositories
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.org_repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  default_branch TEXT NOT NULL DEFAULT 'main',
  provider TEXT NOT NULL DEFAULT 'github'
    CHECK (provider IN ('github', 'gitlab', 'bitbucket')),
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_indexed_commit TEXT,
  last_indexed_at TIMESTAMPTZ,
  index_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (index_status IN ('pending', 'running', 'success', 'failed')),
  index_error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT org_repositories_url_unique UNIQUE (url)
);

CREATE INDEX IF NOT EXISTS idx_org_repositories_index_status
  ON public.org_repositories(index_status);
CREATE INDEX IF NOT EXISTS idx_org_repositories_active
  ON public.org_repositories(is_active) WHERE is_active = true;

-- ---------------------------------------------------------------------------
-- org_projects
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.org_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES public.org_repositories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  root_path TEXT NOT NULL DEFAULT '.',
  summary TEXT,
  tech_stack TEXT[] NOT NULL DEFAULT '{}',
  domain_tags TEXT[] NOT NULL DEFAULT '{}',
  summary_embedding vector(1536),
  profile JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT org_projects_repo_path_unique UNIQUE (repository_id, root_path)
);

CREATE INDEX IF NOT EXISTS idx_org_projects_repository
  ON public.org_projects(repository_id);

-- ---------------------------------------------------------------------------
-- org_knowledge_chunks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.org_knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES public.org_repositories(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.org_projects(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL
    CHECK (source_type IN ('readme', 'source_file', 'doc', 'config')),
  source_path TEXT NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  embedding vector(1536),
  token_count INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}',
  indexed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT org_knowledge_chunks_unique_chunk
    UNIQUE (repository_id, content_hash, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_org_knowledge_chunks_repo_path
  ON public.org_knowledge_chunks(repository_id, source_path);
CREATE INDEX IF NOT EXISTS idx_org_knowledge_chunks_project
  ON public.org_knowledge_chunks(project_id);

CREATE INDEX IF NOT EXISTS idx_org_knowledge_chunks_embedding
  ON public.org_knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ---------------------------------------------------------------------------
-- org_index_runs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.org_index_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES public.org_repositories(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  commit_sha TEXT,
  chunks_created INTEGER NOT NULL DEFAULT 0,
  chunks_updated INTEGER NOT NULL DEFAULT 0,
  chunks_deleted INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  telemetry JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_org_index_runs_repository
  ON public.org_index_runs(repository_id, started_at DESC);

-- ---------------------------------------------------------------------------
-- org_graph_entities
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.org_graph_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL
    CHECK (entity_type IN (
      'project', 'feature', 'capability', 'component', 'industry', 'case_study'
    )),
  name TEXT NOT NULL,
  canonical_key TEXT NOT NULL,
  source_project_id UUID REFERENCES public.org_projects(id) ON DELETE SET NULL,
  attributes JSONB NOT NULL DEFAULT '{}',
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT org_graph_entities_type_key_unique UNIQUE (entity_type, canonical_key)
);

CREATE INDEX IF NOT EXISTS idx_org_graph_entities_project
  ON public.org_graph_entities(source_project_id);

-- ---------------------------------------------------------------------------
-- org_graph_edges
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.org_graph_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_entity_id UUID NOT NULL REFERENCES public.org_graph_entities(id) ON DELETE CASCADE,
  to_entity_id UUID NOT NULL REFERENCES public.org_graph_entities(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL
    CHECK (relation_type IN (
      'CONTAINS', 'IMPLEMENTS', 'USES', 'SIMILAR_TO', 'DELIVERED_FOR', 'REUSES'
    )),
  weight NUMERIC DEFAULT 1.0,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT org_graph_edges_unique_relation
    UNIQUE (from_entity_id, to_entity_id, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_org_graph_edges_from
  ON public.org_graph_edges(from_entity_id);
CREATE INDEX IF NOT EXISTS idx_org_graph_edges_to
  ON public.org_graph_edges(to_entity_id);

-- ---------------------------------------------------------------------------
-- org_memory_runs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.org_memory_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id TEXT NOT NULL,
  executed_by UUID NOT NULL REFERENCES public.profiles(id),
  query TEXT NOT NULL,
  requested_capabilities TEXT[] NOT NULL,
  execution_plan TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed')),
  response JSONB,
  node_telemetry JSONB NOT NULL DEFAULT '[]',
  token_usage JSONB NOT NULL DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_org_memory_runs_executed_by
  ON public.org_memory_runs(executed_by, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_memory_runs_trace
  ON public.org_memory_runs(trace_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS update_org_repositories_updated_at ON public.org_repositories;
CREATE TRIGGER update_org_repositories_updated_at
  BEFORE UPDATE ON public.org_repositories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_org_projects_updated_at ON public.org_projects;
CREATE TRIGGER update_org_projects_updated_at
  BEFORE UPDATE ON public.org_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_org_graph_entities_updated_at ON public.org_graph_entities;
CREATE TRIGGER update_org_graph_entities_updated_at
  BEFORE UPDATE ON public.org_graph_entities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.org_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_index_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_graph_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_graph_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_memory_runs ENABLE ROW LEVEL SECURITY;

-- org_repositories
CREATE POLICY "Authenticated users can view org repositories"
  ON public.org_repositories FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Managers can insert org repositories"
  ON public.org_repositories FOR INSERT TO authenticated
  WITH CHECK (public.is_manager_or_admin());

CREATE POLICY "Managers can update org repositories"
  ON public.org_repositories FOR UPDATE TO authenticated
  USING (public.is_manager_or_admin())
  WITH CHECK (public.is_manager_or_admin());

CREATE POLICY "Admins can delete org repositories"
  ON public.org_repositories FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Service role manages org repositories"
  ON public.org_repositories FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- org_projects
CREATE POLICY "Authenticated users can view org projects"
  ON public.org_projects FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role manages org projects"
  ON public.org_projects FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- org_knowledge_chunks
CREATE POLICY "Authenticated users can view org knowledge chunks"
  ON public.org_knowledge_chunks FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role manages org knowledge chunks"
  ON public.org_knowledge_chunks FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- org_index_runs
CREATE POLICY "Managers can view org index runs"
  ON public.org_index_runs FOR SELECT TO authenticated
  USING (public.is_manager_or_admin());

CREATE POLICY "Service role manages org index runs"
  ON public.org_index_runs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- org_graph_entities
CREATE POLICY "Authenticated users can view org graph entities"
  ON public.org_graph_entities FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role manages org graph entities"
  ON public.org_graph_entities FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- org_graph_edges
CREATE POLICY "Authenticated users can view org graph edges"
  ON public.org_graph_edges FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role manages org graph edges"
  ON public.org_graph_edges FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- org_memory_runs
CREATE POLICY "Users can view own org memory runs"
  ON public.org_memory_runs FOR SELECT TO authenticated
  USING (auth.uid() = executed_by);

CREATE POLICY "Managers can view all org memory runs"
  ON public.org_memory_runs FOR SELECT TO authenticated
  USING (public.is_manager_or_admin());

CREATE POLICY "Service role manages org memory runs"
  ON public.org_memory_runs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

# Feature: Organizational Memory Platform (LangGraph)

**Status**: 🔄 In Progress (Phase 1 complete)
**Author**: SJ Innovation
**Date**: June 23, 2026
**Last Updated**: June 23, 2026

**Related docs**:
- [AI Agent Framework](./ai-agent-framework.md)
- [AI Chat Memory System](../ai-chat-memory-system.md)
- [Architecture Overview](../01-architecture/ARCHITECTURE.md)

---

## Overview

The Organizational Memory Platform is an AI-powered intelligence layer that understands everything the company has built across hundreds of repositories. It treats company project knowledge as a durable **organizational knowledge graph**, not a simple search tool.

The system is built on a **graph-based AI workflow architecture powered by LangGraph**. LangGraph is chosen for long-term extensibility: future workflows (proposal generation, similar project discovery, capability mapping, etc.) attach as independent subgraph nodes without refactoring existing workflows.

**V1 scope** is intentionally narrow:
1. Repository discovery
2. Project understanding
3. Knowledge retrieval (grounded Q&A with citations)

**V1 does not** include multiple specialized agents, autonomous multi-agent collaboration, or generative BD outputs (proposals, timelines, case studies). The architecture must support those as registry plugins in later phases.

### Who uses it

| Role | Use case |
|------|----------|
| BD rep | Find similar past projects and relevant capabilities for a new opportunity |
| Sales | Quickly understand what the company has delivered in a given industry or tech stack |
| PM / Estimator | Retrieve project context, features, and delivery patterns |
| Admin | Manage repository registry, indexing status, and workflow telemetry |

---

## User Stories

- As a **BD rep**, I want to search organizational project knowledge by industry, tech stack, or problem statement so that I can reference relevant past work in conversations.
- As a **sales lead**, I want grounded answers with citations to repo paths and docs so that I can trust what the AI tells prospects.
- As an **admin**, I want to register repositories and see indexing health so that the knowledge base stays current as repos grow.
- As a **PM**, I want a structured project profile (stack, features, domain, outcomes) so that I do not have to manually read READMEs across repos.
- As a **platform engineer**, I want to add new AI workflows as registry entries so that existing workflows remain untouched.

---

## Architecture Principles

1. **Extensibility over shortcuts** — registry-based workflow composition, not monolithic orchestration.
2. **Modular workflows** — each capability is an independently testable subgraph.
3. **Open/closed** — add workflows without modifying existing workflow modules.
4. **Separate ingestion from reasoning** — index repos asynchronously; query graphs read pre-built knowledge.
5. **Hybrid knowledge store** — relational metadata + vector chunks + entity graph relations.
6. **Grounded outputs** — every generative answer includes citations to source artifacts.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         EXPERIENCE LAYER                                 │
│  BD Dashboard UI  │  API clients  │  Future: proposal/case-study tools   │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (Supabase Edge Function)                │
│  org-memory-query  │  org-memory-repos  │  org-memory-index (trigger)    │
│  Auth (JWT)  │  tenancy  │  request validation  │  run persistence       │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   LANGGRAPH WORKFLOW SERVICE                             │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Master Graph                                                      │  │
│  │  START → plan_capabilities → execute_workflows → synthesize → END │  │
│  └───────────────────────────────┬──────────────────────────────────┘  │
│                                  │                                       │
│                    ┌─────────────▼─────────────┐                        │
│                    │     Workflow Registry      │                        │
│                    └─────────────┬─────────────┘                        │
│         ┌────────────────────────┼────────────────────────┐             │
│         ▼                        ▼                        ▼             │
│  repository_discovery    project_understanding    knowledge_retrieval   │
│  (v1)                    (v1)                     (v1)                  │
│                                                                          │
│  Future (registry only, no v1 code):                                    │
│  similar_project_discovery │ feature_extraction │ capability_discovery  │
│  case_study_generation │ proposal_generation │ timeline_generation      │
│  solution_recommendation │ industry_expertise │ reusable_component       │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    ORGANIZATIONAL KNOWLEDGE PLANE                        │
│  PostgreSQL metadata  │  pgvector chunks  │  entity graph tables        │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    ▲
                                    │
┌───────────────────────────────────┴─────────────────────────────────────┐
│                    ASYNC INGESTION PIPELINE                              │
│  repo-indexer → extractor/chunker → embedder → entity-enricher          │
│  Triggered by: cron, webhook, manual admin action                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### Deployment model

| Component | Runtime | Rationale |
|-----------|---------|-----------|
| API gateway Edge Functions | Deno (Supabase) | Auth, RLS boundary, thin proxy |
| LangGraph workflow service | Node.js or Python (dedicated service) | Best LangGraph ergonomics, graph testing |
| Ingestion workers | Background jobs (Edge Function cron or worker service) | Long-running, idempotent indexing |
| Knowledge store | Supabase PostgreSQL + pgvector | Reuse existing stack |

The workflow service is invoked by the gateway with a service-role token. It does **not** replace `run-ai-agent`; it is a parallel intelligence layer consumed by BD features.

---

## LangGraph Design

### Shared state schema

All workflows read/write a versioned, additive state object. New workflows add optional fields only.

```typescript
/** Canonical graph state — extend via optional fields, never rename/remove */
type OrgMemoryState = {
  // --- Request context ---
  traceId: string;
  query: string;
  requestedCapabilities: CapabilityId[];
  filters?: {
    techStack?: string[];
    industry?: string;
    clientId?: string;
    repoIds?: string[];
    projectIds?: string[];
  };

  // --- Planner output ---
  executionPlan: CapabilityId[];

  // --- Working memory (populated by workflows) ---
  candidateRepos: RepoRef[];
  selectedProjects: ProjectRef[];
  retrievedChunks: KnowledgeChunk[];
  graphPaths: GraphEdge[];

  // --- Workflow outputs (optional per capability) ---
  discoveryResult?: DiscoveryResult;
  projectProfiles?: ProjectProfile[];
  retrievalAnswer?: RetrievalAnswer;

  // --- Control plane ---
  completedWorkflows: CapabilityId[];
  nodeTelemetry: NodeTelemetry[];
  errors: WorkflowError[];
};

type CapabilityId =
  | 'repository_discovery'
  | 'project_understanding'
  | 'knowledge_retrieval'
  // Future — registered, not implemented in v1
  | 'similar_project_discovery'
  | 'feature_extraction'
  | 'capability_discovery'
  | 'case_study_generation'
  | 'proposal_generation'
  | 'timeline_generation'
  | 'solution_recommendation'
  | 'industry_expertise_discovery'
  | 'reusable_component_discovery';
```

### Workflow module contract

Every capability implements this interface. The master graph never imports workflow internals directly — only the registry.

```typescript
interface WorkflowModule {
  id: CapabilityId;
  version: string;
  description: string;
  /** Capabilities that must run before this one */
  dependsOn: CapabilityId[];
  /** Build and return a compiled LangGraph subgraph */
  buildSubgraph: () => CompiledGraph<OrgMemoryState>;
}

interface WorkflowRegistry {
  register(module: WorkflowModule): void;
  get(id: CapabilityId): WorkflowModule | undefined;
  resolveExecutionOrder(requested: CapabilityId[]): CapabilityId[];
}
```

### V1 master graph nodes

| Node | Responsibility |
|------|----------------|
| `plan_capabilities` | Resolve `requestedCapabilities` + implicit dependencies via registry topological sort |
| `execute_workflows` | Run each subgraph in order; merge outputs into shared state |
| `synthesize_response` | Combine workflow outputs into a single API response with citations |

V1 `plan_capabilities` is **rule-based** (explicit API params). LLM-based routing is deferred to v2.

### V1 workflow subgraphs

#### 1. `repository_discovery`

| Step | Node | Action |
|------|------|--------|
| 1 | `parse_intent` | Extract filters from query (tech, domain keywords) |
| 2 | `metadata_filter` | SQL filter on `org_repositories` / `org_projects` |
| 3 | `vector_prefilter` | Cosine search on repo/project summary embeddings |
| 4 | `rank_candidates` | Hybrid score: metadata match + vector similarity + recency |
| 5 | `write_discovery_result` | Set `candidateRepos`, `discoveryResult` |

#### 2. `project_understanding`

| Step | Node | Action |
|------|------|--------|
| 1 | `select_targets` | Use `candidateRepos` or explicit `projectIds` |
| 2 | `load_artifacts` | Fetch README, package manifests, top chunks |
| 3 | `synthesize_profile` | LLM → structured `ProjectProfile` |
| 4 | `persist_profile` | Upsert `org_project_profiles` + graph entities |
| 5 | `write_profiles` | Set `projectProfiles` |

#### 3. `knowledge_retrieval`

| Step | Node | Action |
|------|------|--------|
| 1 | `hybrid_retrieve` | Vector + keyword + graph traversal |
| 2 | `rerank` | Cross-encoder or LLM rerank top-k chunks |
| 3 | `grounded_answer` | LLM answer constrained to retrieved chunks |
| 4 | `attach_citations` | Map claims → `org_knowledge_chunks` sources |
| 5 | `write_answer` | Set `retrievalAnswer`, `retrievedChunks` |

### Future workflow registry (planned, not v1)

| Capability | Depends on | Primary output |
|------------|------------|----------------|
| `similar_project_discovery` | `project_understanding` | `SIMILAR_TO` graph edges + ranked list |
| `feature_extraction` | `project_understanding` | `Feature` entities |
| `capability_discovery` | `feature_extraction` | `Capability` entities |
| `case_study_generation` | `project_understanding`, `knowledge_retrieval` | `CaseStudy` artifact |
| `proposal_generation` | `similar_project_discovery`, `capability_discovery` | Ephemeral document |
| `timeline_generation` | `project_understanding` | Ephemeral estimate |
| `solution_recommendation` | `capability_discovery`, `industry_expertise_discovery` | Ranked recommendations |
| `industry_expertise_discovery` | `project_understanding` | `Industry` relations |
| `reusable_component_discovery` | `feature_extraction` | `Component` entities |

Adding any future workflow = new folder under `workflows/` + `registry.register()` — no edits to v1 modules.

### Suggested service layout

```
services/org-memory/
  graph/
    master-graph.ts
    state.ts
    registry.ts
    types.ts
  workflows/
    repository-discovery/
      index.ts
      nodes.ts
      __tests__/
    project-understanding/
      index.ts
      nodes.ts
      __tests__/
    knowledge-retrieval/
      index.ts
      nodes.ts
      __tests__/
  knowledge/
    repositories.ts      # DB access: repos, projects
    chunks.ts            # vector retrieval
    entities.ts          # graph entities/edges
    retrieval.ts         # hybrid search orchestration
  ingestion/
    repo-indexer.ts
    chunker.ts
    entity-extractor.ts
  api/
    server.ts            # HTTP server for graph invocation
```

---

## Functional Requirements

### Repository registry & ingestion
- [ ] FR-1: Admins can register a repository (URL, name, default branch, tags).
- [ ] FR-2: System indexes registered repos asynchronously (clone or API fetch → parse → chunk → embed).
- [ ] FR-3: Index runs are idempotent and track `last_indexed_commit` per repo.
- [ ] FR-4: Admins can view indexing status (pending, running, success, failed) and last run time.
- [ ] FR-5: Re-index can be triggered manually or on schedule (cron/webhook).

### V1 workflows
- [ ] FR-6: `repository_discovery` returns ranked repos/projects matching query and filters.
- [ ] FR-7: `project_understanding` returns structured profiles (name, summary, tech stack, domain, key features).
- [ ] FR-8: `knowledge_retrieval` returns grounded answers with citations (repo, file path, chunk excerpt).
- [ ] FR-9: API accepts `capabilities[]` and runs only registered, requested workflows (+ dependencies).
- [ ] FR-10: Unknown capability IDs return a validation error without executing the graph.

### Knowledge graph
- [ ] FR-11: Extracted entities (projects, features, capabilities, industries, components) persist as graph nodes.
- [ ] FR-12: Relationships (`CONTAINS`, `IMPLEMENTS`, `USES`, `SIMILAR_TO`, etc.) persist as graph edges.
- [ ] FR-13: Workflows read graph relations during retrieval; ingestion writes them.

### Observability
- [ ] FR-14: Every graph invocation persists a run record with per-node telemetry.
- [ ] FR-15: Runs store token usage, latency, retrieval hit counts, and error details.

### Access control
- [ ] FR-16: Authenticated users with BD access can query org memory.
- [ ] FR-17: Only managers/admins can register repos and trigger re-indexing.

---

## Non-Functional Requirements

- [ ] NFR-1: **Query latency** — P95 < 8s for v1 query (3 workflows, pre-indexed repos) at 500-repo scale.
- [ ] NFR-2: **Indexing throughput** — incremental re-index of a single repo < 5 min median.
- [ ] NFR-3: **Scale** — support 500+ repositories with partitioned retrieval (repo summary → chunk detail).
- [ ] NFR-4: **Security** — JWT auth at gateway; service-role only for workflow service; RLS on all tables.
- [ ] NFR-5: **Extensibility** — adding a workflow requires zero changes to existing workflow source files.
- [ ] NFR-6: **Reliability** — ingestion failures are isolated per repo; query graph degrades gracefully if a repo index is stale.
- [ ] NFR-7: **Auditability** — all runs logged with `executed_by`, `trace_id`, capabilities invoked.

---

## Database Design

### Extensions required

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### New tables

#### `org_repositories`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| name | TEXT | NO | | Display name |
| url | TEXT | NO | | Git remote URL |
| default_branch | TEXT | NO | 'main' | Branch to index |
| provider | TEXT | NO | 'github' | github, gitlab, bitbucket |
| tags | TEXT[] | YES | '{}' | Admin tags (team, client, etc.) |
| is_active | BOOLEAN | NO | true | Soft disable indexing |
| last_indexed_commit | TEXT | YES | | SHA of last successful index |
| last_indexed_at | TIMESTAMPTZ | YES | | Timestamp of last success |
| index_status | TEXT | NO | 'pending' | pending, running, success, failed |
| index_error | TEXT | YES | | Last error message |
| metadata | JSONB | NO | '{}' | Provider metadata |
| created_by | UUID | NO | | FK → profiles.id |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | |

Unique constraint: `(url)`.

#### `org_projects`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| repository_id | UUID | NO | | FK → org_repositories.id |
| name | TEXT | NO | | Project name within repo |
| root_path | TEXT | NO | '.' | Monorepo subpath |
| summary | TEXT | YES | | Short description |
| tech_stack | TEXT[] | YES | '{}' | Detected technologies |
| domain_tags | TEXT[] | YES | '{}' | e.g. healthcare, fintech |
| summary_embedding | vector(1536) | YES | | For coarse discovery |
| profile | JSONB | NO | '{}' | Structured ProjectProfile |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | |

Unique constraint: `(repository_id, root_path)`.

#### `org_knowledge_chunks`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| repository_id | UUID | NO | | FK → org_repositories.id |
| project_id | UUID | YES | | FK → org_projects.id |
| source_type | TEXT | NO | | readme, source_file, doc, config |
| source_path | TEXT | NO | | File path within repo |
| content | TEXT | NO | | Chunk text |
| content_hash | TEXT | NO | | Dedup key |
| chunk_index | INTEGER | NO | 0 | Order within source file |
| embedding | vector(1536) | YES | | Semantic vector |
| token_count | INTEGER | YES | | Approximate tokens |
| metadata | JSONB | NO | '{}' | Language, symbols, etc. |
| indexed_at | TIMESTAMPTZ | NO | now() | |
| created_at | TIMESTAMPTZ | NO | now() | |

Indexes:
- `ivfflat` on `embedding` (cosine)
- B-tree on `(repository_id, source_path)`
- Unique on `(repository_id, content_hash, chunk_index)`

#### `org_index_runs`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| repository_id | UUID | NO | | FK → org_repositories.id |
| status | TEXT | NO | 'running' | running, success, failed |
| started_at | TIMESTAMPTZ | NO | now() | |
| completed_at | TIMESTAMPTZ | YES | | |
| commit_sha | TEXT | YES | | Indexed commit |
| chunks_created | INTEGER | NO | 0 | |
| chunks_updated | INTEGER | NO | 0 | |
| chunks_deleted | INTEGER | NO | 0 | |
| error_message | TEXT | YES | | |
| telemetry | JSONB | NO | '{}' | Timing, file counts |

#### `org_graph_entities`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| entity_type | TEXT | NO | | project, feature, capability, component, industry, case_study |
| name | TEXT | NO | | Entity label |
| canonical_key | TEXT | NO | | Stable dedup key |
| source_project_id | UUID | YES | | FK → org_projects.id |
| attributes | JSONB | NO | '{}' | Type-specific fields |
| embedding | vector(1536) | YES | | Optional semantic index |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | |

Unique constraint: `(entity_type, canonical_key)`.

#### `org_graph_edges`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| from_entity_id | UUID | NO | | FK → org_graph_entities.id |
| to_entity_id | UUID | NO | | FK → org_graph_entities.id |
| relation_type | TEXT | NO | | CONTAINS, IMPLEMENTS, USES, SIMILAR_TO, DELIVERED_FOR, REUSES |
| weight | NUMERIC | YES | 1.0 | Confidence or similarity score |
| metadata | JSONB | NO | '{}' | |
| created_at | TIMESTAMPTZ | NO | now() | |

Unique constraint: `(from_entity_id, to_entity_id, relation_type)`.

#### `org_memory_runs`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| trace_id | TEXT | NO | | Correlates with workflow service logs |
| executed_by | UUID | NO | | FK → profiles.id |
| query | TEXT | NO | | User query |
| requested_capabilities | TEXT[] | NO | | |
| execution_plan | TEXT[] | NO | | Resolved order |
| status | TEXT | NO | 'running' | running, completed, failed |
| response | JSONB | YES | | Final synthesized output |
| node_telemetry | JSONB | NO | '[]' | Per-node timings and counts |
| token_usage | JSONB | NO | '{}' | Input/output tokens |
| error_message | TEXT | YES | | |
| started_at | TIMESTAMPTZ | NO | now() | |
| completed_at | TIMESTAMPTZ | YES | | |

### Relationships

- `org_projects.repository_id` → `org_repositories.id` (ON DELETE CASCADE)
- `org_knowledge_chunks.repository_id` → `org_repositories.id` (ON DELETE CASCADE)
- `org_knowledge_chunks.project_id` → `org_projects.id` (ON DELETE SET NULL)
- `org_index_runs.repository_id` → `org_repositories.id` (ON DELETE CASCADE)
- `org_graph_entities.source_project_id` → `org_projects.id` (ON DELETE SET NULL)
- `org_graph_edges.from_entity_id` → `org_graph_entities.id` (ON DELETE CASCADE)
- `org_graph_edges.to_entity_id` → `org_graph_entities.id` (ON DELETE CASCADE)

### RLS policies

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `org_repositories` | authenticated | manager/admin | manager/admin | admin |
| `org_projects` | authenticated | service role (ingestion) | service role | admin |
| `org_knowledge_chunks` | authenticated | service role | service role | service role |
| `org_index_runs` | manager/admin | service role | service role | admin |
| `org_graph_entities` | authenticated | service role | service role | admin |
| `org_graph_edges` | authenticated | service role | service role | admin |
| `org_memory_runs` | own rows + manager/admin | authenticated (via Edge Function) | service role | admin |

Helper: reuse `is_manager_or_admin()` from existing RLS patterns.

### Reuse of existing tables

| Existing | Usage |
|----------|-------|
| `ai_shared_resources` | Optional: link vector store IDs for large doc corpora |
| `ai_agent_runs` | Do **not** merge — `org_memory_runs` is domain-specific |
| `profiles` | `created_by`, `executed_by` FKs |

---

## API Design

### Edge Functions

| Function | Method | Purpose |
|----------|--------|---------|
| `org-memory-query` | POST | Invoke LangGraph master graph for discovery/understanding/retrieval |
| `org-memory-repos` | GET, POST, PATCH | CRUD for repository registry |
| `org-memory-index` | POST | Trigger async indexing for one or all repos |
| `org-memory-runs` | GET | List/query run history |

Environment variables (workflow service):

| Variable | Purpose |
|----------|---------|
| `ORG_MEMORY_SERVICE_URL` | Base URL of LangGraph service |
| `ORG_MEMORY_SERVICE_KEY` | Shared secret for gateway → service auth |
| `OPENAI_API_KEY` | Embeddings + LLM (or reuse existing) |

### `POST /functions/v1/org-memory-query`

**Request:**
```json
{
  "query": "What React + Supabase projects have we built in healthcare?",
  "capabilities": [
    "repository_discovery",
    "project_understanding",
    "knowledge_retrieval"
  ],
  "filters": {
    "techStack": ["react", "supabase"],
    "industry": "healthcare"
  },
  "options": {
    "maxRepos": 10,
    "maxChunks": 20,
    "includeCitations": true
  }
}
```

**Response:**
```json
{
  "traceId": "tr_01H...",
  "runId": "uuid",
  "capabilities": ["repository_discovery", "project_understanding", "knowledge_retrieval"],
  "discovery": {
    "repos": [
      {
        "id": "uuid",
        "name": "patient-portal",
        "url": "https://github.com/org/patient-portal",
        "score": 0.91,
        "matchedSignals": ["healthcare", "react", "supabase"]
      }
    ]
  },
  "projects": [
    {
      "id": "uuid",
      "name": "Patient Portal",
      "summary": "HIPAA-oriented patient scheduling and records UI.",
      "techStack": ["react", "typescript", "supabase", "tailwind"],
      "domainTags": ["healthcare"],
      "keyFeatures": ["appointment booking", "secure messaging", "provider dashboard"]
    }
  ],
  "answer": {
    "text": "We have delivered...",
    "citations": [
      {
        "chunkId": "uuid",
        "repositoryId": "uuid",
        "sourcePath": "README.md",
        "excerpt": "HIPAA-compliant patient portal built with React and Supabase..."
      }
    ],
    "confidence": 0.87
  },
  "telemetry": {
    "totalMs": 4200,
    "workflows": [
      { "id": "repository_discovery", "ms": 800 },
      { "id": "project_understanding", "ms": 2100 },
      { "id": "knowledge_retrieval", "ms": 1300 }
    ]
  }
}
```

### `POST /functions/v1/org-memory-repos`

**Request (create):**
```json
{
  "name": "patient-portal",
  "url": "https://github.com/org/patient-portal",
  "defaultBranch": "main",
  "tags": ["healthcare", "react"]
}
```

### `POST /functions/v1/org-memory-index`

**Request:**
```json
{
  "repositoryId": "uuid",
  "force": false
}
```

Omit `repositoryId` to enqueue all active repos.

### React hooks (v1 UI)

| Hook | Purpose | Query key |
|------|---------|-----------|
| `useOrgMemoryQuery` | Execute query mutation | N/A (mutation) |
| `useOrgRepositories` | List registered repos | `['org_memory', 'repos']` |
| `useCreateOrgRepository` | Register repo | Invalidates `['org_memory', 'repos']` |
| `useTriggerOrgIndex` | Trigger re-index | Invalidates repo + runs |
| `useOrgMemoryRuns` | Run history | `['org_memory', 'runs']` |

---

## UI Design (v1)

### Pages

| Route | Component | Purpose |
|-------|-----------|---------|
| `/org-memory` | `OrgMemoryDashboard.tsx` | Search + results (discovery, profiles, grounded answer) |
| `/admin/org-memory` | `OrgMemoryAdmin.tsx` | Repo registry, index status, run logs |

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `OrgMemorySearch.tsx` | `src/features/org-memory/components/` | Query input + capability toggles |
| `DiscoveryResults.tsx` | same | Ranked repo list |
| `ProjectProfileCard.tsx` | same | Structured project summary |
| `GroundedAnswer.tsx` | same | Answer with expandable citations |
| `RepoRegistryTable.tsx` | same | Admin repo CRUD + index status |
| `IndexStatusBadge.tsx` | same | pending/running/success/failed |

### User flow (v1)

1. User navigates to `/org-memory`.
2. User enters a natural-language query and selects capabilities (defaults: all three v1 workflows).
3. System invokes `org-memory-query` → LangGraph service.
4. UI shows loading with per-workflow progress (from telemetry when available).
5. Results render in three sections: discovered repos, project profiles, grounded answer with citations.
6. Admin registers repos at `/admin/org-memory` and monitors indexing.

---

## Validation Rules

| Field | Rule | Error message |
|-------|------|---------------|
| `query` | Required, 3–2000 chars | "Query is required" |
| `capabilities` | At least one valid v1 capability | "Select at least one capability" |
| `url` (repo) | Valid HTTPS git URL | "Invalid repository URL" |
| `name` (repo) | Required, 1–200 chars | "Repository name is required" |
| `defaultBranch` | Required, 1–100 chars | "Branch is required" |

---

## Testing Plan

### Unit tests
- [ ] `WorkflowRegistry.resolveExecutionOrder` — dependency ordering, cycle detection
- [ ] Each v1 subgraph node — mock knowledge layer, assert state mutations
- [ ] Hybrid retrieval scoring — metadata + vector merge logic
- [ ] Citation attachment — every claim maps to a chunk id

### Integration tests
- [ ] Full query flow: API → graph service → DB → response shape
- [ ] Indexing flow: register repo → index → chunks + embeddings exist
- [ ] Idempotent re-index: same commit does not duplicate chunks
- [ ] RLS: rep can query, cannot register repos; admin can register

### Manual testing
- [ ] Query across 10+ indexed repos with tech/industry filters
- [ ] Verify citations link to real file paths
- [ ] Force index failure → repo `index_status = failed`, query still works for other repos
- [ ] Add a stub fourth workflow to registry → confirm v1 workflows unchanged

---

## Dependencies

- [ ] PostgreSQL `pgvector` extension (already used elsewhere in project)
- [ ] LangGraph runtime (`@langchain/langgraph` for Node, or `langgraph` for Python)
- [ ] Embedding provider (`generate-embeddings` pattern or OpenAI embeddings API)
- [ ] LLM provider (OpenAI / Lovable gateway — align with `ai-agent-framework.md`)
- [ ] Git provider API or clone access for indexing (GitHub token minimum)
- [ ] New Supabase migration for org memory tables
- [ ] Dedicated workflow service deployment target (Railway, Fly.io, or internal VM)

---

## Implementation Phases

### Phase 0 — Foundation (week 1)
- [x] Apply database migration
- [x] Scaffold `services/org-memory/` with registry + master graph shell
- [x] Deploy workflow service skeleton (health check only)
- [x] Edge Function `org-memory-query` proxy with auth
- [x] Stub Edge Functions: `org-memory-repos`, `org-memory-index`, `org-memory-runs`

### Phase 1 — Ingestion (week 2)
- [x] `org-memory-repos` CRUD
- [x] `org-memory-index` indexer (README + key files via GitHub)
- [x] Chunking + embedding pipeline
- [x] `/org-memory` UI (search + repo registry + index)

### Phase 2 — V1 workflows (weeks 3–4)
- [ ] Implement `repository_discovery` subgraph
- [ ] Implement `project_understanding` subgraph
- [ ] Implement `knowledge_retrieval` subgraph
- [ ] Persist `org_memory_runs` telemetry
- [ ] User-facing `/org-memory` search UI

### Phase 3 — Knowledge graph enrichment (week 5)
- [ ] Entity extraction during indexing
- [ ] `org_graph_entities` + `org_graph_edges` population
- [ ] Graph-aware retrieval in `knowledge_retrieval`

### Phase 4 — Future workflows (ongoing)
- [ ] Register `similar_project_discovery` as first extension workflow
- [ ] BD integration: surface org memory from deal/client intelligence screens

---

## Migration Plan

1. Deploy database migration (`supabase db push`).
2. Deploy workflow service with `ORG_MEMORY_SERVICE_KEY`.
3. Set project secrets (not `functions secrets`):
   ```bash
   supabase secrets set ORG_MEMORY_SERVICE_URL=https://your-public-org-memory-host
   supabase secrets set ORG_MEMORY_SERVICE_KEY=your-shared-secret
   ```
   **Local Edge Functions only** (`supabase functions serve`): you may use
   `ORG_MEMORY_SERVICE_URL=http://host.docker.internal:3100` while `services/org-memory` runs on the host.
   **Deployed remote functions** cannot reach `localhost` — use a public URL (Railway, Fly.io, ngrok, etc.).
4. Deploy Edge Functions: `org-memory-query`, `org-memory-repos`, `org-memory-index`, `org-memory-runs`.
5. Register initial repo batch via admin UI; run first index.
6. Deploy frontend routes and components.
7. Verify in staging with 5–10 repos before scaling registry.

**Rollback**: disable Edge Functions; set `is_active = false` on repos; workflow service can be taken offline without affecting existing BD Dashboard features.

---

## Anti-Patterns (do not implement)

1. **Monolithic orchestrator** — do not add org memory logic to `run-ai-agent/index.ts`.
2. **Live cloning on query** — indexing must be async only.
3. **Hardcoded workflow chains** — use registry, not `if/else` capability switches.
4. **Vector-only memory** — persist entities and relations, not just embeddings.
5. **Un-cited LLM answers** — every retrieval response must include citations in v1.

---

## Open Questions

| # | Question | Default assumption |
|---|----------|-------------------|
| 1 | Node.js or Python for LangGraph service? | Node.js (`@langchain/langgraph`) to match TS stack |
| 2 | GitHub org-wide sync vs manual registration? | Manual registration in v1; org sync in v2 |
| 3 | Monorepo handling — one repo, many projects? | `org_projects.root_path` per subproject |
| 4 | Integrate with deal/client records? | Optional `filters.clientId` in v2; no FK in v1 |

---

## Success Criteria (architecture, not feature completeness)

- [ ] Adding `proposal_generation` requires only a new workflow module + registry entry.
- [ ] V1 workflow source files remain unchanged when phase 4 workflows are added.
- [ ] Query over 500 pre-indexed repos completes without live git operations.
- [ ] Every retrieval answer includes at least one citation.
- [ ] Full run trace available in `org_memory_runs` for debugging.

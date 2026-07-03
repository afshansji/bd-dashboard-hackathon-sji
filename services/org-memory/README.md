# Organizational Memory Service

LangGraph workflow service for the SJ organizational memory platform.

## Phase 1

- GitHub repo indexing (README + config files)
- Chunking + embeddings → `org_knowledge_chunks`
- Real discovery, project profiles, and grounded retrieval workflows
- `POST /index` endpoint

## Setup

```bash
cd services/org-memory
cp .env.example .env
# Edit .env — SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY or LOVABLE_API_KEY
npm install
npm run dev
```

## Run locally

```bash
npm run dev   # :3100
```

**Health:**
```bash
curl http://localhost:3100/health
```

**Index a repository** (after registering via UI or `org-memory-repos`):
```bash
curl -X POST http://localhost:3100/index \
  -H "Content-Type: application/json" \
  -d '{"repositoryId": "YOUR-REPO-UUID"}'
```

**Query:**
```bash
curl -X POST http://localhost:3100/query \
  -H "Content-Type: application/json" \
  -d '{
    "traceId": "tr_local",
    "query": "What Supabase projects exist?",
    "capabilities": ["repository_discovery", "knowledge_retrieval"]
  }'
```

## Environment

| Variable | Required | Purpose |
|----------|----------|---------|
| `SUPABASE_URL` | Yes | Database access |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Indexing + search writes |
| `OPENAI_API_KEY` or `LOVABLE_API_KEY` | For embeddings | Vector search |
| `GITHUB_TOKEN` | Optional | Rate limits + private repos |
| `ORG_MEMORY_SERVICE_KEY` | Optional | Auth header `x-org-memory-key` |

## UI

Open http://localhost:8080/org-memory (with dashboard `npm run dev`).

1. Register a public GitHub repo
2. Click **Index**
3. Search knowledge

For cloud Edge Functions to reach this service, set:
```bash
supabase secrets set ORG_MEMORY_SERVICE_URL=https://your-public-url
```

## Tests

```bash
npm test
```

See [docs/06-ai-features/org-memory-platform.md](../../docs/06-ai-features/org-memory-platform.md).

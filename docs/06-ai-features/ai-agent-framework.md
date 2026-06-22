# AI Agent Framework

This document outlines the new governance, orchestration, and frontend workflows that support AI agents across the dashboard.

## Supabase schema updates
- `ai_agents` now stores a `config` JSONB payload describing provider routing (primary, fallback, research) and feature flags.
- `ai_agent_runs` tracks provider telemetry in the `output` column alongside a `provider_chain` array summarising execution order.
- `ai_shared_resources` captures vector stores and uploaded knowledge artifacts that can be associated with one or more agents.
- Timestamp triggers keep `updated_at` fields current for agents, configurations, and shared resources.
- RLS policies grant read access to PMs while restricting write operations to managers and super admins.

## Environment variables
Edge Functions expect the following environment variables to be configured:

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | **Required** - Primary OpenAI routing and fallback behaviour. Must match this exact name. |
| `GEMINI_API_KEY` | Optional Gemini provider support |
| `PERPLEXITY_API_KEY` | Enables Perplexity research provider |
| `ANTHROPIC_API_KEY` | Optional Claude routing |
| `EXA_API_KEY` | Required for Exa-powered research and enrichment edge functions |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase service authentication for Edge Functions |

**Important**: The secret name must be exactly `OPENAI_API_KEY` (not `OPENAI_KEY` or any other variant) for both the Integration Hub test function and the AI agent framework to work correctly.

## Edge Functions
- `run-ai-agent` now orchestrates provider selection, retries (primary → fallback → OpenAI mini → research), telemetry capture, and schema validation.
- `create-company-vector-store` registers vector store identifiers under `ai_shared_resources` for downstream retrieval.
- `linkedin-upload-file-to-openai` records uploaded documents and their corresponding vector store entries for reuse.
- Shared utilities in `supabase/functions/_shared/providers.ts` provide provider hydration, credential lookup, and telemetry formatting.

## Frontend integration
- API helpers in `src/Api/aiAgents.ts` centralise Supabase queries for agents and run history.
- React Query hooks (`useAgentList`, `useRunAIAgent`, `useAgentRunHistory`, `useUpdateAgentConfig`) manage caching, optimistic updates, and cache invalidation.
- The LinkedIn agent admin page (`src/pages/admin/LinkedInAgentConfig.tsx`) surfaces configuration controls, on-demand execution, and run history.
- `AgentConfigModal` and `AgentRunHistoryPanel` provide reusable UI primitives for managing provider routing and telemetry review.

## Testing
- Deno tests in `supabase/functions/run-ai-agent/__tests__/provider-chain.test.ts` validate provider chain assembly logic.
- Frontend hooks and components rely on existing React Query patterns; run `npm run test` to execute the Bun-powered suite.

## Deployment checklist
1. Run Supabase migrations: `supabase db push`.
2. Deploy Edge Functions: `supabase functions deploy run-ai-agent create-company-vector-store linkedin-upload-file-to-openai`.
3. Update environment variables for OpenAI, Gemini, Perplexity, Anthropic, and Exa providers. For Exa, run:
   ```bash
   supabase functions secrets set EXA_API_KEY=<value>
   ```
4. Rebuild the frontend (`npm run build`) to surface the LinkedIn configuration dashboard.

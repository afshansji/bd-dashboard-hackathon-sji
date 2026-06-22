# Logic & Functions

_Last Updated: 2025-02-18_

This document catalogues the Supabase edge functions, supporting client logic, and how automation flows interact with shared data models.

## Supabase Edge Functions (Deno)
All functions live under `supabase/functions/<name>/index.ts`, import shared CORS helpers from `_shared`, and expect the Supabase service-role key via `SUPABASE_SERVICE_ROLE_KEY`.

### Function: admin-users
- **File:** `supabase/functions/admin-users/index.ts`
- **Purpose:** CRUD interface for platform users, brand assignments, and granular permissions.
- **Highlights:** Filters by role/status, orchestrates Supabase Admin API calls, and syncs `user_brands` plus `user_permissions` in a transaction.

### Function: admin-brands
- **File:** `supabase/functions/admin-brands/index.ts`
- **Purpose:** Manage brand catalogue, KPI metadata, and brand ownership.
- **Endpoints:** `GET` list, `POST` create brand, `PUT` update brand, `DELETE` deactivate entry.

### Function: admin-products
- **File:** `supabase/functions/admin-products/index.ts`
- **Purpose:** CRUD for product catalogue stored in `products` table. Returns JSON payloads for admin merchandising features.

### Function: auth
- **File:** `supabase/functions/auth/index.ts`
- **Purpose:** Token exchange helpers that validate Supabase sessions, return enriched profile/role data, and issue temporary elevated tokens for admin actions.

### Function: create-company-vector-store
- **File:** `supabase/functions/create-company-vector-store/index.ts`
- **Purpose:** Upsert a vector store reference into `ai_shared_resources` for a given `ai_agents` record.
- **Inputs:** `{ agent_id: uuid, vector_store_id: string, metadata?: { description?: string, provider?: string } }`

### Function: eod-data-sync
- **File:** `supabase/functions/eod-data-sync/index.ts`
- **Purpose:** Pull ActiveCollab task activity, persist to `activecollab_task_data`, and queue updates for `team_eod_submissions` and `team_daily_summaries`.

### Function: generate-eod-summary
- **File:** `supabase/functions/generate-eod-summary/index.ts`
- **Purpose:** Produce AI summaries for a given date by combining EOD submissions, ActiveCollab data, and historical agent runs.

### Function: generate-code
- **File:** `supabase/functions/generate-code/index.ts`
- **Purpose:** Invoke OpenAI templates for scaffolded React/TypeScript code, storing audit logs in `code_analyses` and `code_analysis_results` on failure.

### Function: gohighlevel-manage
- **File:** `supabase/functions/gohighlevel-manage/index.ts`
- **Purpose:** Bridge GoHighLevel CRM: sync contacts, handle webhook updates, and toggle integration state in `gohighlevel_integrations`.

### Function: hubspot-sync
- **File:** `supabase/functions/hubspot-sync/index.ts`
- **Purpose:** Import deals and company data from HubSpot, map them to `deals`, `clients`, and `contacts`, and keep pipeline stages aligned.

### Function: import-hours
- **File:** `supabase/functions/import-hours/index.ts`
- **Purpose:** Developer utility for ingesting CSV payloads of billable hours into `analytics_data` to reconcile against EOD submissions.

### Function: integrations-dashboard
- **File:** `supabase/functions/integrations-dashboard/index.ts`
- **Purpose:** Provide a consolidated JSON feed of HubSpot and GoHighLevel integration state, toggle activation flags, and verify encrypted credential presence.

### Function: linkedin-upload-file-to-openai
- **File:** `supabase/functions/linkedin-upload-file-to-openai/index.ts`
- **Purpose:** Support the LinkedIn research agent by uploading documents to OpenAI vector stores and persisting references in `ai_shared_resources`.

### Function: manage-feedback
- **File:** `supabase/functions/manage-feedback/index.ts`
- **Purpose:** Admin endpoints for triaging feedback, updating statuses, and joining related `feedback_comments`.

### Function: manage-followups
- **File:** `supabase/functions/manage-followups/index.ts`
- **Purpose:** Generate and update follow-up tasks linked to BD deals, storing artifacts in `followup_tasks` tables (see migrations).

### Function: n8n-analytics-manage
- **File:** `supabase/functions/n8n-analytics-manage/index.ts`
- **Purpose:** Receive analytics payloads from n8n, validate secrets, persist metrics into `brand_analytics_data`, and expose integration summaries.

### Function: openai-test
- **File:** `supabase/functions/openai-test/index.ts`
- **Purpose:** Health check endpoint that verifies OpenAI credentials and response formatting; meant for staging/debug use only.

### Function: run-ai-agent
- **File:** `supabase/functions/run-ai-agent/index.ts`
- **Purpose:** Central dispatcher for executing registered AI agents with multi-provider fallbacks, telemetry capture, and optional task creation.
- **Telemetry:** Writes provider chain details and outputs into `ai_agent_runs` with step-level metadata.

### Function: seed-sample-eod-data
- **File:** `supabase/functions/seed-sample-eod-data/index.ts`
- **Purpose:** Populate development environments with representative EOD submissions, ActiveCollab task mirrors, and AI summaries.

### Function: submit-feedback
- **File:** `supabase/functions/submit-feedback/index.ts`
- **Purpose:** Public submission endpoint for the feedback widget that creates `feedback_reports`, optional attachments, and notification events.

### Function: sync-control-tower-deals
- **File:** `supabase/functions/sync-control-tower-deals/index.ts`
- **Purpose:** Pull deal data from the Control Tower Supabase project (via environment variables) and upsert into `control_tower_deals` for dashboarding.

### Function: gemini-veo-manager
- **File:** `supabase/functions/gemini-veo-manager/index.ts`
- **Purpose:** Proxy Google Gemini Veo requests: kick off renders, handle webhooks, and update `gemini_videos` plus legacy `videos` table entries.

## Client-Side Service Layer

### Axios + REST Helpers
- `src/lib/axiosPrivate.ts` creates an Axios instance bound to `VITE_API_BASE_URL`, injects Supabase auth tokens, and retries on `401` by refreshing the session.

### Supabase Browser Client
- `src/integrations/supabase/client.ts` builds a typed Supabase client using `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, exposing helper hooks for auth-aware components.

### React Query Hooks
- `src/hooks/usePods.tsx`, `useTargetNiches.tsx`, `useBDCampaigns.tsx` coordinate CRUD flows for PODs, niches, and campaigns.
- `src/hooks/useControlTowerConfig.ts` and `useSyncControlTowerDeals.tsx` load Control Tower credentials and trigger the `sync-control-tower-deals` function.
- `src/features/eod/hooks/useEodSubmissions.ts` manages creation and retrieval of team EOD submissions while chaining the `generate-eod-summary` function.

### AI & Integrations Components
- `src/components/ai/AIAgentRunner.tsx` streams responses from `run-ai-agent`, displays provider telemetry, and writes optimistic tasks.
- `src/pages/admin/IntegrationManager.tsx` combines Supabase data with functions (`integrations-dashboard`, `manage-feedback`, `manage-followups`) to present toggles and queues.
- `src/pages/video/GeminiVideoStudioPage.tsx` orchestrates Gemini renders with polling and asset download components.

## Automation Flow Summary
1. **Data Ingestion:** External systems (HubSpot, GoHighLevel, n8n, ActiveCollab, Control Tower) call respective edge functions that upsert into domain tables and emit analytics entries.
2. **AI Processing:** `run-ai-agent`, `generate-code`, and `generate-eod-summary` coordinate AI providers, store outputs in `ai_agent_runs` or `team_daily_summaries`, and surface follow-up tasks when applicable.
3. **Frontend Consumption:** React Query hooks and Supabase real-time listeners hydrate admin dashboards, BD tooling, documentation, and analytics widgets.
4. **Feedback Loop:** `submit-feedback` captures user input while `manage-feedback` and `manage-followups` allow administrators to triage issues and convert them into actionable tasks.

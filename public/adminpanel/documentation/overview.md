# SJ Business Development AI Platform

_Last Updated: 2025-02-18_

## Project Summary
- **Purpose:** Unified command center for SJ Innovation's business development, client operations, and automation teams.
- **Highlights:** Role-aware admin workspace, BD pipeline dashboards, AI-assisted workflows, Gemini Veo video studio, and Supabase-backed automation for CRM and reporting tasks.

## Tech Stack
| Layer | Technologies |
| --- | --- |
| Frontend | Vite, React 18, TypeScript, React Router, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form |
| Backend APIs | Supabase Edge Functions (Deno runtime) exposed via Supabase Functions client, Axios REST helpers |
| Data & Auth | Supabase Postgres, Supabase Auth with RLS, Supabase Storage, row-level audit triggers |
| Tooling | ESLint, TypeScript, Bun (unit tests), Fuse.js search, Lucide icons, Supabase CLI |

## Folder Structure Highlights
| Path | Description |
| --- | --- |
| `src/main.tsx`, `src/App.tsx` | Application bootstrap, router shell, auth gate checks, and layout composition. |
| `src/components/` | Shared UI primitives (cards, tables, dialogs) plus reusable widgets such as AI runners, analytics cards, and admin forms. |
| `src/features/` | Domain-specific modules grouped by feature (admin management, BD tooling, video studio, AI agents) with colocated hooks/services. |
| `src/pages/` | Route-level screens (`/adminpanel`, BD dashboards, AI tooling pages, Gemini studio, reporting views). |
| `src/hooks/` | React Query hooks and custom logic (`usePods`, `useTargetNiches`, `useControlTowerConfig`, `useSyncControlTowerDeals`, `useAccountabilityGoals`). |
| `src/lib/` | Shared utilities including Supabase documentation index, Axios client factory, and helper utilities. |
| `src/integrations/supabase/` | Supabase client factory and generated types for typed PostgREST access. |
| `supabase/functions/` | Deno edge functions powering admin CRUD, CRM integrations, AI orchestration, analytics ingestion, and feedback loops. |
| `supabase/migrations/` | SQL migrations for schema, RLS policies, triggers, and seed data. |
| `public/adminpanel/documentation/` | Markdown sources rendered inside the Admin Panel Documentation view. |

## Environment Variables
| Variable | Location | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Vite client | Supabase project URL used by the browser client factory (`src/integrations/supabase/client.ts`). |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Vite client | Public anon key for the Supabase browser client. |
| `VITE_API_BASE_URL` | Vite client | Base URL for Axios wrapper that proxies Supabase edge functions (`src/lib/axiosPrivate.ts`). |
| `VITE_CONTROL_TOWER_URL` | Vite client | Control Tower Supabase instance used for deal synchronization (`src/hooks/useControlTowerConfig.ts`). |
| `VITE_CONTROL_TOWER_ANON_KEY` | Vite client | Public anon key for Control Tower Supabase access. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase CLI / Edge | Required for local edge function execution, migrations, and server-side Supabase clients. |
| `OPENAI_API_KEY`, `GEMINI_API_KEY` | Edge functions | Provider keys consumed by AI edge functions (`run-ai-agent`, `generate-code`, `gemini-veo-manager`). |
| `EXA_API_KEY`, `VITE_EXA_API_KEY` | Edge functions / Vite client | **New.** Powers the Exa research proxy and (optionally) local client-side previews documented in [Exa Search Integration](exa-integration.md). |
| `OPENAI_API_KEY`, `GEMINI_API_KEY`, `EXA_API_KEY` | Edge functions | Provider keys consumed by AI edge functions (`run-ai-agent`, `generate-code`, `gemini-veo-manager`, Exa research utilities). |
| `HUBSPOT_PRIVATE_APP_TOKEN`, `GHL_API_KEY` | Edge functions secrets | CRM integration tokens decrypted by `integrations-dashboard` and related sync functions. |

### Permissions Modules Snapshot
- `user_permissions.modules.aiResearch` — Grants access to the Exa Research Workbench surface.
- `user_permissions.modules.intelBriefings` — Unlocks the intelligence briefings generated from Exa snapshots.

Assign these modules alongside existing `dashboard`, `taskHub`, `reports`, `settings`, and `adminPanel` toggles to keep access synchronized across admin roles.

## Major Components & Responsibilities
- **Admin Shell (`src/components/AdminLayout.tsx`):** Builds sidebar navigation, permission-aware routes, and feature hubs (documentation, KPIs, integrations, AI tooling).
- **Authentication (`src/features/auth`):** Context providers, Supabase session management, and route guards enforced in `src/App.tsx`.
- **Business Development Workflows (`src/pages/bd/*`):** POD management, target niche research, the new campaign strategy board at `/bd/strategy/campaigns`, and control-tower synchronisation widgets.
- **AI Automation (`src/pages/ai-agents`, `src/components/ai`):** Interfaces for configuring, executing, and auditing AI agents with streaming output.
- **Feedback & Integrations (`src/pages/admin/IntegrationManager.tsx`, `supabase/functions/manage-feedback`):** Manage CRM connectors, handle product feedback pipelines, and review aggregated insights.
- **Reporting & Video Studio (`src/pages/EODSubmission.tsx`, `src/pages/video/GeminiVideoStudioPage.tsx`):** Capture daily updates, orchestrate Gemini Veo renders, and present analytics snapshots.

## Build & Run Workflow
1. Install dependencies: `npm install`
2. Start development server with hot reload: `npm run dev`
3. Run lint checks before commits: `npm run lint`
4. Execute Bun-powered tests: `npm run test`
5. Build production bundle: `npm run build`
6. Optional: strict type-check without emitting files: `npx tsc --noEmit`
7. Serve Supabase edge functions locally as needed: `supabase functions serve <name> --env-file .env.local`

# Campaign Strategy & Execution Hub

_Last Updated: 2025-03-02_

## Overview
The Campaign Strategy workflow unifies POD goals, niche research, and multichannel execution under `/bd/strategy/campaigns`. It replaces the legacy `/bd/campaigns` grid with a planner that aligns revenue targets, outreach cadences, AI automation, and QA guardrails. This document covers the data model, edge automation, UI architecture, AI support, and review expectations for the new experience.

### Objectives
- Centralize campaign planning, execution, and QA readiness in one view.
- Provide real-time context by blending POD, niche, and CRM data.
- Support AI-assisted content generation with clear human approval checkpoints.
- Offer analytics slices for pipeline health, QA reviews, and integration telemetry.

## Database Schema
Campaign strategy builds on the `campaigns` table introduced in 2025-03 migrations. Legacy `bd_campaigns` data is migrated but left read-only for historical dashboards.

### `campaigns`
| Column | Type | Description |
| --- | --- | --- |
| `id` | UUID | Primary key (`gen_random_uuid()`). |
| `pod_id` | UUID | References `pods.id`; used for aggregate OKR rollups. |
| `niche_id` | UUID | References `target_niches.id`; cascades deletes. |
| `name` | Text | Human readable campaign name. |
| `objective` | Text | Strategic objective statement shown in briefings. |
| `channel_mix` | Text[] | Ordered list of channels (`linkedin`, `email`, `events`, etc.). |
| `status` | Enum (`planning`, `scheduled`, `active`, `cooldown`, `completed`, `archived`) | Execution state surfaced in the strategy board. |
| `launch_date` | Date | Planned go-live date. |
| `end_date` | Date | Planned completion date. |
| `target_accounts` | Integer | Target account count drawn from the ICP. |
| `owner_user_id` | UUID | References `users.id`; default assignee. |
| `qa_reviewer_id` | UUID | References `users.id`; required before activation. |
| `ai_brief_id` | UUID | References `campaign_ai_briefs.id`; optional. |
| `budget_usd` | Numeric | Budget placeholder for paid channel sync. |
| `created_by` | UUID | References `users.id`; creator. |
| `created_at` | Timestamptz | Defaults `now()`. |
| `updated_at` | Timestamptz | Auto managed trigger. |

#### Relationships & Supporting Tables
- `campaign_briefs` (PK `id`) — stores long-form briefs, guardrails, and creative requirements. Linked via `campaign_briefs.campaign_id`.
- `campaign_ai_briefs` — embeds AI prompt templates and response history. Linked to `campaigns.ai_brief_id`.
- `campaign_milestones` — timeline checkpoints (`research`, `asset_draft`, `launch`, `postmortem`) with `due_at` and completion flags.
- `campaign_channels` — join table mapping `campaign_id` to individual channel configs (cadence, content source, integration payload IDs).
- `campaign_metrics_daily` — aggregated metrics by date (contacts, responses, meetings, deals, influenced pipeline). Powered by analytics ingestion.
- `campaign_review_logs` — QA/Compliance sign-offs referencing `qa_reviewer_id` and `campaign_id` with notes.

### Legacy Reference
`bd_campaigns` is retained as a read-only view in the Admin Panel for historical charts. No new writes occur after the migration. References to `/bd/campaigns` should explicitly call out the legacy data room to avoid confusion.

## Edge Function Behaviors
| Function | Purpose | Key Notes |
| --- | --- | --- |
| `campaigns-sync` | Primary CRUD handler for the new table. | Validates QA reviewer assignment before activation; enforces RLS for owners and managers. |
| `campaigns-brief-ai` | Generates and stores AI briefs. | Uses OpenAI + Gemini; writes into `campaign_ai_briefs` and updates `campaigns.ai_brief_id`. |
| `campaigns-metrics-refresh` | Nightly ingestion via n8n. | Loads HubSpot/GHL metrics into `campaign_metrics_daily`, emits Supabase realtime events. |
| `campaigns-review-webhook` | Receives QA approvals from Notion/Slack workflow. | Appends `campaign_review_logs`, toggles status to `scheduled` when QA sign-off arrives. |
| `legacy-bd-campaigns-export` | Snapshot exporter for the legacy table. | Read-only; scheduled to retire after Q3 2025. |

## Frontend Architecture
- **Route:** `/bd/strategy/campaigns` managed by `src/pages/bd/strategy/CampaignStrategyPage.tsx`.
- **Primary Components:**
  - `CampaignStrategyBoard` — Kanban sections per status with drag-and-drop powered by `@dnd-kit`.
  - `CampaignDetailSheet` — Right-hand drawer showing briefs, milestones, and QA checklists.
  - `ChannelConfigList` — Channel-level overrides pulling from `campaign_channels`.
  - `MetricsSparkline` — Inline analytics referencing `campaign_metrics_daily`.
- **State Management:** TanStack Query for CRUD, Zustand store `useCampaignBoardStore` for optimistic drag state.
- **Permissions:** `useRlsGuard` hook to gate actions based on Supabase session claims.

## AI Agent Support
- **Brief Authoring Agent:** Launches via "Generate AI Brief" in the detail sheet, stores outputs in `campaign_ai_briefs`. Requires manual QA edit before finalization.
- **Cadence Builder Agent:** Creates multi-channel cadences and pushes them into `campaign_channels`. Respects `channel_mix` order.
- **Analytics Summarizer:** Summaries daily metrics and posts to Slack `#bd-campaigns` via `campaigns-metrics-refresh` function.

## Integrations
- **HubSpot & GoHighLevel:** Metrics ingestion and deal linkage (IDs stored on `campaign_channels.integration_payload`).
- **Notion QA Database:** QA checklist tasks mirrored into Notion; statuses flow back through `campaigns-review-webhook`.
- **Slack:** Notifications for status changes and AI brief completions.
- **n8n Automations:** Orchestrates nightly metric refresh and weekly AI recap digests.

## Permissions & Roles
- **Super Admin / BD Director:** Full CRUD, QA override, can archive campaigns.
- **POD Lead:** CRUD within their POD (`pod_id` scope), assign QA reviewers from approved list.
- **BD Specialist:** Can update milestones, metrics, and AI briefs on owned campaigns; cannot activate without QA check.
- **QA Reviewer:** Read/write access to `campaign_review_logs`; can toggle QA approval fields.
- **Viewer:** Read-only board view with metrics and briefs.

## Analytics Coverage
- **In-Board Metrics:** Sparklines and totals per status column using `campaign_metrics_daily`.
- **Drilldown Dashboards:** `/analytics/campaigns` uses Supabase views for funnel and influence reporting.
- **QA Compliance:** `campaign_review_logs` aggregated to show approval SLAs.
- **Legacy Comparison:** Toggle to compare against `bd_campaigns` historical performance, flagged as read-only.

## Review Checklist (QA Handoff)
- [x] Schema definitions documented (`campaigns`, supporting tables).
- [x] Edge functions mapped with behaviors and retirement timelines.
- [x] Frontend architecture outlined with component responsibilities.
- [x] AI agent touchpoints described with approval requirements.
- [x] Integrations and permissions detailed for QA verification.
- [x] Analytics coverage defined for reporting validation.
- [ ] UI screenshots/diagrams linked (see Docs reference below).

### Docs & Visual References
- Planned UX diagram: `docs/campaigns-strategy-flow.png` (capture latest board layout during next UI QA run).
- Edge automation sequence: reuse `docs/n8n-eod-workflow-setup.md` patterns for future campaign-specific playbooks.

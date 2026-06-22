---
name: sj-bd-dashboard-architecture
description: "Architecture of SJ BD Dashboard. Load for architectural decisions, new feature planning, or onboarding new developers."
---

# SJ BD Dashboard - Architecture Reference

**Project**: SJ BD Dashboard
**Domain**: Business Development & CRM Platform
**Owner**: SJ Innovation
**Purpose**: Comprehensive BD platform for managing deals, campaigns, clients, AI automation, and team performance tracking.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | React | 18.3+ |
| Language | TypeScript | 5.8+ |
| Build Tool | Vite + SWC | 5.4+ |
| Routing | React Router DOM | 6.30+ |
| Server State | TanStack Query | 5.83+ |
| UI Components | Radix UI + shadcn/ui | 48 components |
| Styling | Tailwind CSS | 3.4+ |
| Rich Text | TipTap | 3.13+ |
| Forms | React Hook Form + Zod | 7.61+ / 3.25+ |
| Charts | Recharts | 2.15+ |
| Backend | Supabase (PostgreSQL) | Latest |
| Edge Functions | Deno Runtime | Latest |
| Auth | Supabase Auth (JWT) | Built-in |

## Directory Structure

```
sj-bd-dashboard/
├── src/
│   ├── App.tsx              # Routing (50+ routes, role-based)
│   ├── main.tsx             # Entry point
│   ├── pages/               # 75 page components
│   │   ├── admin/           # Admin panel (20 pages)
│   │   ├── bd/              # Business development (25+ pages)
│   │   │   └── pipeline/    # 6 pipeline stage pages
│   │   ├── analytics/       # 2 analytics pages
│   │   └── feedback/        # 4 feedback pages
│   ├── components/          # 150+ components
│   │   ├── ui/              # 48 shadcn/ui primitives
│   │   ├── accountability/  # 11 accountability chart components
│   │   ├── bd/              # 70+ BD components (campaigns, deals, sequences)
│   │   ├── dhs/             # DHS submission components
│   │   ├── tasks/           # 16 task management components
│   │   ├── signing/         # 8 document signing components
│   │   ├── ai/              # AI agent components
│   │   ├── notifications/   # 4 notification components
│   │   └── feedback/        # 15 feedback components
│   ├── hooks/               # 111 custom hooks (data fetching layer)
│   ├── features/            # 16 domain feature modules
│   │   ├── ai/agents/       # 7 agent runner/config components
│   │   ├── campaign-detail/ # 5 campaign analytics components
│   │   ├── feedback/        # 3 feedback feature files
│   │   └── pipeline/        # 1 AI lead evaluation
│   ├── Api/                 # 4 API modules
│   │   ├── adminCampaigns.ts
│   │   ├── aiAgents.ts
│   │   ├── sequences.ts
│   │   └── sqlExecutor.ts
│   ├── lib/                 # 5 shared utilities
│   │   ├── utils.ts         # cn(), formatRelativeTime()
│   │   ├── axiosPrivate.ts  # Authenticated HTTP client
│   │   ├── dealStages.ts    # Pipeline stage constants
│   │   ├── documentation.ts # Doc index
│   │   └── urlUtils.ts      # URL validation
│   ├── types/               # 7 type definition files
│   ├── utils/               # 5 utility modules
│   └── integrations/
│       ├── supabase/
│       │   ├── client.ts    # Supabase client
│       │   └── types.ts     # Generated types (5163 lines)
│       └── controlTower/
│           ├── client.ts    # Dynamic client factory
│           └── restApiClient.ts
├── supabase/
│   ├── functions/           # 71 Edge Functions
│   │   ├── _shared/         # 12 shared utility modules
│   │   ├── run-ai-agent/    # Main AI orchestrator
│   │   ├── admin-campaigns/ # Campaign CRUD
│   │   ├── sync-control-tower-*/ # HubSpot sync (6 functions)
│   │   └── ...
│   └── migrations/          # 224 migration files
├── tests/                   # Test files (bun test)
├── docs/                    # Feature documentation
│   └── migrations/          # Migration guides
└── public/
    └── adminpanel/documentation/  # In-app docs
```

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│                                                      │
│  Page Component                                      │
│       │                                              │
│       ▼                                              │
│  Custom Hook (src/hooks/)                            │
│       │                                              │
│       ├──► TanStack Query (useQuery/useMutation)     │
│       │        │                                     │
│       │        ▼                                     │
│       ├──► Supabase Client (direct DB access)        │
│       │        │                                     │
│       ├──► axiosPrivate (authenticated REST)         │
│       │        │                                     │
│       └──► Edge Functions (supabase.functions.invoke)│
│                │                                     │
└────────────────┼─────────────────────────────────────┘
                 │
┌────────────────┼─────────────────────────────────────┐
│                ▼        BACKEND                       │
│                                                      │
│  Supabase Edge Functions (Deno)                      │
│       │                                              │
│       ├──► PostgreSQL (via service role client)       │
│       ├──► OpenAI / Perplexity / Anthropic (AI)      │
│       ├──► SendGrid (email)                          │
│       ├──► Control Tower / HubSpot (CRM sync)        │
│       ├──► PandaDoc (document signing)               │
│       ├──► Exa (lead research)                       │
│       ├──► ZeroBounce (email validation)             │
│       └──► GoHighLevel (marketing)                   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

## Database Schema Overview (92+ tables)

### Core Domain Tables

| Domain | Tables | Purpose |
|--------|--------|---------|
| **Users** | profiles, users, user_roles, user_permissions, user_notifications, user_activity_log | Auth, roles, permissions, activity |
| **Campaigns** | bd_campaigns, campaign_contacts, campaign_sequences, sequence_steps, contact_sequence_enrollments, sequence_execution_log, campaign_emails, campaign_tags, campaign_financial_data, campaign_import_jobs | Campaign management, email automation |
| **Deals** | deals, deal_comments, deal_files, deal_checklist_items, deal_system_info | Pipeline management |
| **Clients** | clients, contacts, employees, leads | CRM records |
| **Tasks** | project_tasks, task_comments, task_comment_mentions, task_labels, project_task_labels, task_attachments, task_history | Task management |
| **DHS** | dhs_submissions | Daily BD health tracking |
| **Accountability** | accountability_quarters, accountability_team_goals, accountability_rep_goals, accountability_activities, accountability_weekly_updates | Quarterly goal tracking |
| **AI** | ai_agents, ai_agent_runs, ai_agent_templates, ai_shared_resources, ai_configurations, bd_weekly_reports | AI agent framework |
| **Signing** | signing_documents, signing_document_recipients, signing_document_activity_log, signing_document_watchers | PandaDoc integration |
| **Feedback** | feedback_reports, feedback_comments, feedback_upvotes | User feedback |
| **Integrations** | control_tower_sync_log, control_tower_health_snapshots, zerobounce_config, zerobounce_validations, pandadoc_integrations, gohighlevel_integrations, analytics_api_consumers | External services |

### Key Relationships
```
campaigns → campaign_contacts → contacts
campaigns → campaign_sequences → sequence_steps
deals → clients → contacts
deals → deal_comments, deal_files, deal_checklist_items
deals → signing_documents → recipients, watchers
project_tasks → task_comments → task_comment_mentions
accountability_quarters → team_goals, rep_goals → activities → weekly_updates
ai_agents → ai_agent_runs, ai_shared_resources
auth.users → profiles, user_roles, user_permissions
```

## Role Hierarchy & Access Control

```
super_admin → Full access to everything
    admin   → Admin panel, user management, all data
    manager → Team data, approvals, reports, client intelligence
        pm  → Project management level
      user  → (team_member) Own data, BD operations, transparency views
```

RLS policies enforce this hierarchy. Key helper function: `is_manager_or_admin()`.

Transparency policy: DHS submissions, accountability data, and feedback are visible to ALL authenticated users.

## Module Status

### Complete ✅
- Authentication & Authorization (Supabase Auth, JWT, role-based RLS)
- Campaign Management (CRUD, contacts, email sequences, ROI, import/export)
- Deal Pipeline (5 stages, checklists, comments, files, slug system)
- Client Management (CRUD, health stats, Control Tower sync)
- Contact & Lead Management (Exa import, enrichment, validation)
- Task Management (CRUD, comments, mentions, labels, attachments, history)
- DHS Daily Health Tracking (submit, edit, team dashboard, reminders)
- Accountability Chart (quarters, goals, approval workflow, activities, weekly updates)
- AI Agent Framework (7-step config, provider fallback, 5 agent types, execution history)
- Email Sequences (enrollment, batch processing, execution logs, realtime)
- Document Signing (PandaDoc integration, recipients, watchers, activity log)
- Control Tower / HubSpot Sync (bi-directional, health monitoring, 6 sync functions)
- Analytics Dashboard (time series, team performance, usage analytics)
- Feedback System (submit, vote, comment, triage, weekly summary)
- Notification System (in-app, email, task mentions, deal assignments)
- Proposal Management (CRUD, analytics, conversion funnel)
- Follow-up Tracking (AI suggestions, status management)
- External Analytics API (consumers, push, webhook)
- User Activity Logging

### Known Tech Debt ⚠️
- `tsconfig.json` has `noImplicitAny: false`, `strictNullChecks: false` — should migrate to strict mode
- `bd_campaigns` table (v1) coexists with `campaigns` (v2) — v1 still in use by hooks
- Limited test coverage (3 test files in `tests/`)
- Some components exceed 200 lines
- `console.log` statements likely remain in some files
- Generated types file is 5163 lines — consider splitting

### Planned ❌
- (No explicitly planned features identified in codebase)

## External Integration Map

| Integration | Direction | Functions | Config Location |
|-------------|-----------|-----------|-----------------|
| HubSpot (Control Tower) | Bi-directional | sync-control-tower-* (6 functions) | ai_configurations table |
| OpenAI | Outbound | run-ai-agent, auto-enrich-leads, bd-research-batch | Edge Function env vars |
| Perplexity | Outbound | campaign-contact-research, lead-research-evaluate | Edge Function env vars |
| Anthropic | Outbound (fallback) | run-ai-agent (fallback chain) | Edge Function env vars |
| SendGrid | Outbound | send-campaign-email, send-dhs-reminder, notifications | Edge Function env vars |
| PandaDoc | Bi-directional | pandadoc-manage | pandadoc_integrations table |
| Exa | Outbound | admin-leads-exa-*, lead-research-evaluate | Edge Function env vars |
| ZeroBounce | Outbound | zerobounce-manage | zerobounce_config table |
| GoHighLevel | Outbound | gohighlevel-manage | gohighlevel_integrations table |
| Google Sheets | Inbound | campaign-google-sheet-import | OAuth |

## AI Provider Fallback Chain

```
Primary: OpenAI (GPT-4)
    ↓ (if fails)
Fallback 1: Perplexity
    ↓ (if fails)
Fallback 2: Anthropic (Claude)
    ↓ (if fails)
Fallback 3: OpenAI Mini (GPT-3.5)
```

Configured in `supabase/functions/_shared/providers.ts`. Telemetry tracked in `ai_agent_runs.provider_chain`.

## Scheduled Jobs (Cron)

| Function | Schedule | Purpose |
|----------|----------|---------|
| send-dhs-reminder | Daily 9 AM | Remind users to submit DHS |
| scheduled-bd-manager-weekly-review | Monday 9 AM | Generate weekly BD analysis |
| calculate-performance-metrics | Daily | Calculate user performance scores |
| weekly-feedback-summary | Weekly | Aggregate feedback metrics |
| lead-cron-sync | Periodic | Sync lead data |
| cleanup-sync-logs | Periodic | Remove old sync logs |
| notify-low-usage | Periodic | Alert on low platform usage |

## Deployment

- **Frontend**: Lovable (https://lovable.dev/projects/75f1f847-1a59-4bd3-9eb9-780955a7d4bf)
- **Backend**: Supabase (managed)
- **Edge Functions**: `supabase functions deploy [name]`
- **Build**: `npm run build` (Vite production build)
- **Dev Server**: `npm run dev` (port 8080)
- **Tests**: `npm run test` (bun test runner)
- **Lint**: `npm run lint` (ESLint 9+)

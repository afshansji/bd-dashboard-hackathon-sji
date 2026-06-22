# Agent Registry for SJ BD Dashboard

## Overview
This project has 10 specialized agents. Claude Code automatically delegates tasks to the appropriate agent based on the work being requested.

## Agent Roster

| # | Agent | Purpose | Tools | Mode |
|---|-------|---------|-------|------|
| 1 | react-frontend-dev | UI components, pages, hooks, routing | Read, Write, Edit, Bash, Glob, Grep | Builder |
| 2 | supabase-backend-dev | Database, Edge Functions, RLS, auth | Read, Write, Edit, Bash, Glob, Grep | Builder |
| 3 | code-reviewer | Code quality enforcement | Read, Grep, Glob | Read-only |
| 4 | debugger | Bug investigation, error analysis | Read, Edit, Bash, Glob, Grep | Investigator |
| 5 | documentation-engineer | Specs, docs, implementation guides | Read, Write, Edit, Glob, Grep | Writer |
| 6 | performance-engineer | Performance optimization, profiling | Read, Edit, Bash, Glob, Grep | Optimizer |
| 7 | refactoring-specialist | Safe code restructuring, tech debt | Read, Write, Edit, Bash, Glob, Grep | Builder |
| 8 | security-auditor | Security scanning, vulnerability detection | Read, Grep, Glob | Read-only |
| 9 | typescript-pro | Type safety, generics, zero any | Read, Write, Edit, Glob, Grep | Builder |
| 10 | test-automator | Unit tests, integration tests, RLS tests | Read, Write, Edit, Bash, Glob, Grep | Builder |

## Auto-Delegation Rules

Claude should automatically invoke the right agent(s) based on user request:

### Single-Agent Triggers

| User Says | Agent | Why |
|-----------|-------|-----|
| "Fix bug / error / broken / crash / blank screen" | **debugger** | Bug investigation specialist |
| "Review code / check quality / before PR" | **code-reviewer** | Read-only quality enforcer |
| "Write spec / create docs / implementation guide" | **documentation-engineer** | Specs-first documentation |
| "Create component / page / form / UI" | **react-frontend-dev** | React/TypeScript specialist |
| "Create table / Edge Function / migration / RLS" | **supabase-backend-dev** | Supabase/PostgreSQL specialist |
| "Page is slow / optimize / performance" | **performance-engineer** | Performance optimization |
| "Refactor / clean up / split component / tech debt" | **refactoring-specialist** | Safe code restructuring |
| "Security review / audit / check vulnerabilities" | **security-auditor** | Read-only security scanning |
| "Fix types / remove any / type error" | **typescript-pro** | TypeScript type safety |
| "Write tests / add coverage / test this" | **test-automator** | Test creation specialist |

### Multi-Agent Workflows

#### New Feature (full workflow)
```
1. documentation-engineer   → Write spec first (ALWAYS before code)
2. supabase-backend-dev     → Create tables, RLS policies, Edge Functions
3. react-frontend-dev       → Build UI components, pages, hooks, routes
4. typescript-pro           → Verify type safety, fix any types
5. test-automator           → Write unit and integration tests
6. code-reviewer            → Final quality check
7. security-auditor         → Security audit (if sensitive feature)
```

#### Bug Fix
```
1. debugger                 → Investigate root cause (follow sj-bug-fix-workflow)
2. react-frontend-dev       → Apply frontend fix
   OR supabase-backend-dev  → Apply backend fix
3. test-automator           → Write regression test
4. code-reviewer            → Verify fix quality
```

#### Refactor Sprint
```
1. code-reviewer            → Identify all issues and tech debt
2. refactoring-specialist   → Restructure code safely
3. typescript-pro           → Improve types (zero any)
4. performance-engineer     → Verify no performance regression
5. test-automator           → Verify no behavior change
6. code-reviewer            → Final quality check
```

#### Pre-Release Checklist
```
1. code-reviewer            → Full quality scan
2. security-auditor         → Security audit
3. performance-engineer     → Performance check
4. test-automator           → Run/verify all tests
```

#### Tech Debt Cleanup
```
1. code-reviewer            → Identify debt areas
2. typescript-pro           → Fix all type issues
3. refactoring-specialist   → Restructure messy code
4. performance-engineer     → Optimize slow areas
5. test-automator           → Add missing test coverage
6. code-reviewer            → Final verification
```

#### Type Safety Migration
```
1. typescript-pro           → Audit current any usage, plan migration
2. typescript-pro           → Fix types file by file (types → hooks → components → pages)
3. test-automator           → Add type-related tests
4. code-reviewer            → Verify strict compliance
```

## Project-Specific Context

- **Project**: SJ BD Dashboard
- **Domain**: Business Development & CRM Platform (Agency / Internal BD Operations)
- **Stack**: React 18.3, TypeScript 5.8, Vite 5.4, Supabase PostgreSQL, Tailwind 3.4, shadcn/ui (48 components), TanStack Query 5.83, React Hook Form 7.61, Zod 3.25
- **Database**: 92+ tables across 11 domains (users, campaigns, deals, clients, tasks, DHS, accountability, AI, signing, feedback, integrations)
- **Edge Functions**: 68 functions (AI agents, campaign email, sync, admin, analytics, notifications, utility)
- **Pages**: 75 page components (admin, BD, analytics, feedback)
- **Hooks**: 83 custom hooks (ALL data fetching goes through hooks)
- **Components**: 242 React components (150+ feature + 48 shadcn/ui)
- **Migrations**: 228 SQL migration files
- **Tests**: 4 test files (critical coverage gap)

### Key Modules
| Module | Status | Key Files |
|--------|--------|-----------|
| Authentication & Authorization | ✅ Complete | `useAuth.tsx`, RLS policies |
| Campaign Management | ✅ Complete | `useBDCampaigns.tsx`, 70+ components |
| Deal Pipeline | ✅ Complete | `useDeals.tsx`, 5 stage views |
| Client Management | ✅ Complete | `useClients.tsx`, Control Tower sync |
| Task Management | ✅ Complete | `useProjectTasks.tsx`, 16 components |
| DHS Health Tracking | ✅ Complete | `useDHSSubmissions.tsx` |
| Accountability Chart | ✅ Complete | 5 hooks, 11 components |
| AI Agent Framework | ✅ Complete | 7-step wizard, provider fallback |
| Email Sequences | ✅ Complete | Realtime subscriptions |
| Document Signing | ✅ Complete | PandaDoc integration |
| Control Tower Sync | ✅ Complete | 6 sync functions |
| Analytics | ✅ Complete | Time series, team performance |
| Feedback System | ✅ Complete | Submit, vote, comment |
| Notifications | ✅ Complete | In-app, email via SendGrid |

### Known Tech Debt
- `tsconfig.json` has `noImplicitAny: false` and `strictNullChecks: false`
- `bd_campaigns` (v1) coexists with `campaigns` (v2) — hooks still reference v1
- Only 4 test files for entire project
- Some components exceed 200 lines
- Generated types file is 5163 lines
- `campaign_channels`, `brand_kpis`, `brands` tables may be missing RLS policies

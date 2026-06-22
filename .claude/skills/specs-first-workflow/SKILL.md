---
name: specs-first-workflow
description: "Specs-first development workflow for SJ Innovation. No code without specs. Creates specifications before implementation, tracks feature status, and prepares Lovable handoff guides."
---

# Specs-First Development Workflow

## Core Rule

**NO CODE WITHOUT SPECS.** Every new feature, every significant change, every module addition must have a specification document BEFORE any code is written.

This is not optional. This is how SJ Innovation builds software.

## When This Applies

- New features or modules
- Significant changes to existing features
- New database tables or schema changes
- New Edge Functions
- New integrations
- Any work that spans multiple files or domains

## When This Does NOT Apply

- Bug fixes (use sj-bug-fix-workflow instead)
- Typo corrections
- Single-line changes
- Dependency updates

## Step 1: Check Existing Docs

Before writing anything, check:
```
docs/                          # Feature documentation
docs/migrations/               # Migration guides
public/adminpanel/documentation/  # In-app docs
```

Search for existing specs related to your feature. Don't duplicate.

## Step 2: Write the Spec

Create spec at: `docs/feature_name.md`

### Spec Template

```markdown
# Feature: [Feature Name]

**Status**: ❌ Planned | 🔄 In Progress | ✅ Complete | ⚠️ Tech Debt
**Author**: [name]
**Date**: [date]
**Last Updated**: [date]

---

## Overview

[1-2 paragraph description of the feature, its purpose, and who uses it]

## User Stories

- As a [role], I want to [action] so that [benefit]
- As a [role], I want to [action] so that [benefit]

## Functional Requirements

### [Requirement Group 1]
- [ ] FR-1: [Description]
- [ ] FR-2: [Description]

### [Requirement Group 2]
- [ ] FR-3: [Description]

## Non-Functional Requirements

- [ ] NFR-1: Performance — [specific metric]
- [ ] NFR-2: Security — [specific requirement]
- [ ] NFR-3: Accessibility — [specific requirement]

## Database Design

### New Tables

#### `table_name`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| created_at | TIMESTAMPTZ | NO | now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NO | now() | Last update timestamp |
| [column] | [type] | [yes/no] | [default] | [description] |

#### Relationships
- `table_name.fk_id` → `other_table.id` (ON DELETE CASCADE)

#### RLS Policies
- SELECT: [who can view]
- INSERT: [who can create]
- UPDATE: [who can modify]
- DELETE: [who can remove]

### Schema Changes to Existing Tables
- `existing_table`: Add column `new_column` (TYPE, description)

## API Design

### Edge Functions
| Function | Method | Purpose |
|----------|--------|---------|
| `function-name` | POST | [description] |

### Request/Response
```json
// POST /functions/v1/function-name
// Request
{ "action": "create", "data": { ... } }
// Response
{ "id": "uuid", "status": "created" }
```

### React Hooks
| Hook | Purpose | Query Key |
|------|---------|-----------|
| `useFeatureName` | Fetch list | ['feature_name'] |
| `useCreateFeatureName` | Create mutation | Invalidates ['feature_name'] |

## UI Design

### Pages
| Route | Component | Purpose |
|-------|-----------|---------|
| `/path` | `PageComponent.tsx` | [description] |

### Components
| Component | Location | Purpose |
|-----------|----------|---------|
| `ComponentName.tsx` | `src/components/domain/` | [description] |

### User Flow
1. User navigates to [page]
2. User clicks [action]
3. System shows [response]
4. User fills [form]
5. System saves [data]

## Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| name | Required, min 1 char | "Name is required" |
| email | Valid email format | "Invalid email address" |

## Testing Plan

### Unit Tests
- [ ] Hook: `useFeatureName` — success, error, empty states
- [ ] Component: `FeatureForm` — validation, submission
- [ ] Utility: [any utility functions]

### Integration Tests
- [ ] Full create flow: form → hook → database → display
- [ ] RLS: verify access control for each role

### Manual Testing
- [ ] Test as admin, manager, and regular user
- [ ] Test loading, error, and empty states
- [ ] Test form validation edge cases

## Dependencies

- [ ] Requires table X to exist
- [ ] Requires Edge Function Y
- [ ] Requires npm package Z (version)

## Migration Plan

1. Deploy database migration
2. Deploy Edge Function(s)
3. Deploy frontend code
4. Verify in staging
5. Deploy to production
```

## Step 3: Lovable Handoff Guide (if applicable)

For features implemented via Lovable, create an implementation guide:

### Implementation Guide Template

```markdown
# Implementation Guide: [Feature Name]

**Spec**: [link to spec]
**Target**: Lovable implementation
**Date**: [date]

---

## Prerequisites

- [ ] Migration `YYYYMMDDHHMMSS_feature_name.sql` has been applied
- [ ] Edge Function `function-name` is deployed
- [ ] Types regenerated: `supabase gen types typescript`

## Step-by-Step Implementation

### Step 1: Database (already done)
SQL migration applied. Tables: [list]

### Step 2: Create Hook
File: `src/hooks/useFeatureName.tsx`
```typescript
// [Full hook code]
```

### Step 3: Create Components
File: `src/components/domain/ComponentName.tsx`
```typescript
// [Full component code]
```

### Step 4: Add Route
File: `src/App.tsx`
Add route: `<Route path="/path" element={<PageComponent />} />`

### Step 5: Add Navigation
File: `src/components/layout/Sidebar.tsx` (or appropriate nav)
Add menu item for the new feature.

## Testing Checklist
- [ ] Page loads without errors
- [ ] Data displays correctly (loading, error, empty states)
- [ ] Forms validate and submit
- [ ] Mutations update UI optimistically
- [ ] Role-based access works correctly
- [ ] Mobile responsive
```

## Status Indicators

Use these consistently across all specs and CLAUDE.md:

| Indicator | Meaning |
|-----------|---------|
| ✅ | Complete — feature is live and working |
| 🔄 | In Progress — actively being developed |
| ❌ | Planned — spec exists but no code yet |
| ⚠️ | Tech Debt — works but needs improvement |
| 🗑️ | Deprecated — scheduled for removal |

## Documentation Locations

| Type | Location |
|------|----------|
| Feature specs | `docs/feature_name.md` |
| Migration guides | `docs/migrations/` |
| In-app documentation | `public/adminpanel/documentation/` |
| Architecture reference | `CLAUDE.md` |
| Agent registry | `.claude/agents.md` |

## Rules

1. **Spec before code** — No exceptions for new features. Write the spec first.
2. **Update spec as you build** — Requirements change during implementation. Keep the spec current.
3. **Status indicators are mandatory** — Every spec must have a status indicator.
4. **Never deviate from spec without updating** — If the implementation differs from the spec, update the spec first.
5. **Lovable handoff must be complete** — Include every file, every line of code, every route change.
6. **Test plan is part of the spec** — Don't ship without a testing plan.
7. **Dependencies must be listed** — Other teams need to know what your feature depends on.
8. **Migration plan is required** — How do we deploy this? What order? What can go wrong?
9. **Keep specs concise** — Focus on what matters. Don't pad specs with obvious information.
10. **Review specs before implementing** — Have another team member review the spec. Catch design issues early.

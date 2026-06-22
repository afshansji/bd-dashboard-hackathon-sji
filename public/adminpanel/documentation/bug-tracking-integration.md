# Bug & Feature Tracking Integration

This guide documents the lightweight feedback system that lets any authenticated user submit bug reports or feature requests while giving super admins the tools to triage, discuss, and close items from the Admin Panel.

## Purpose & Flow Overview

```mermaid
digraph FeedbackFlow {
  rankdir=LR;
  User["Logged-in user"];
  Form["/feedback/submit form\n(React + Supabase Storage)"];
  EdgeFunc["submit-feedback edge function"];
  Table["feedback_reports table"];
  AdminUI["/adminpanel/feedback\nreview workspace"];
  ManageFunc["manage-feedback edge function"];
  Email["Optional thank-you email"];

  User -> Form -> EdgeFunc -> Table;
  Form -> "Supabase Storage\nfeedback bucket";
  EdgeFunc -> Email;
  AdminUI -> ManageFunc -> Table;
  AdminUI -> ManageFunc -> "feedback_comments";
}
```

1. **Submission** — Any authenticated user opens `/feedback/submit` from the sidebar or floating widget. Files upload directly to the private `feedback` storage bucket before the form calls `submit-feedback`.
2. **Edge Processing** — `submit-feedback` validates the feature flag, persists the record in `feedback_reports`, and optionally triggers a thank-you email.
3. **Review** — Super admins open `/adminpanel/feedback`, which lazily loads the React admin workspace. All data loads via the `manage-feedback` edge function, keeping the core API stateless.
4. **Lifecycle** — Admins post comments, update statuses, and archive items. Every action maps to a Supabase Edge Function call to avoid server load on the core Vite app.

## Database Schema

### Table: `feedback_reports`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID (PK) | Pre-generated on client for deterministic storage paths |
| `type` | `text` | `bug` \| `feature` |
| `subject` | `text` | Required summary |
| `description` | `text` | Optional long-form notes |
| `status` | `text` | `open` (default), `in_review`, `resolved`, `closed` |
| `email` | `text` | Captured from Supabase Auth |
| `attachment_url` | `text` | Relative path inside the `feedback` storage bucket |
| `created_by` | `uuid` | References `profiles.id` |
| `reviewed_by` | `uuid` | References `profiles.id` when an admin takes ownership |
| `created_at` / `updated_at` | `timestamptz` | Automatic timestamps |
| `deleted_at` | `timestamptz` | Soft-delete marker used when archiving |

**Sample row**
```json
{
  "id": "f7c61f65-1a5e-4a6c-8b7f-73a9e43b1bda",
  "type": "bug",
  "subject": "Project dashboard throws 500 when filtering",
  "description": "Repro: open dashboard, select Q4 filter, observe HTTP 500.",
  "status": "in_review",
  "email": "alex@example.com",
  "attachment_url": "f7c61f65-1a5e-4a6c-8b7f-73a9e43b1bda/screenshot.png",
  "created_by": "d12d7f5e-0f5b-4c82-92c0-3f6f8f8d3d2b",
  "reviewed_by": "b91e59f3-d19d-4a60-927e-4abde9113e44",
  "created_at": "2025-10-30T14:00:00Z",
  "updated_at": "2025-10-30T14:42:00Z",
  "deleted_at": null
}
```

### Table: `feedback_comments`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID (PK) | Auto generated |
| `feedback_id` | UUID | FK → `feedback_reports.id` |
| `user_id` | UUID | FK → `profiles.id` |
| `comment` | `text` | Required body |
| `created_at` | `timestamptz` | Auto timestamp |

**Sample row**
```json
{
  "id": "bf86a8b4-5ec7-4a09-958a-40bd7d0e7f55",
  "feedback_id": "f7c61f65-1a5e-4a6c-8b7f-73a9e43b1bda",
  "user_id": "b91e59f3-d19d-4a60-927e-4abde9113e44",
  "comment": "Patched in hotfix 1.12.1 — please verify on staging.",
  "created_at": "2025-10-30T14:32:00Z"
}
```

## Edge Function Behaviors

### `submit-feedback`
- **Method**: `POST /submit-feedback`
- **Auth**: Requires logged-in user (`Authorization: Bearer <JWT>`)
- **Validations**:
  - Checks `feedback_enabled` flag before accepting new submissions.
  - Accepts optional `attachmentPath` already uploaded to Supabase Storage.
- **Writes**: Inserts a new row into `feedback_reports` with status `open`.
- **Email**: When `feedback_auto_email` is `true`, sends a thank-you email via Mailgun (silently skipped if environment variables are missing).
- **Response**: `{ "id": "<uuid>", "status": "open" }`

### `manage-feedback`
- **Auth**: Requires `super_admin` role (verified against `user_roles`).
- **Routes**:
  - `GET /manage-feedback/list` — Filter by `type`, `status`, and `includeClosed` to return a paged list.
  - `GET /manage-feedback/:id` — Returns a feedback record, comment history, and a signed download URL.
  - `POST /manage-feedback/:id/comment` — Adds a comment on behalf of the authenticated admin.
  - `PUT /manage-feedback/:id/status` — Updates `status` (`open`, `in_review`, `resolved`, `closed`) and sets `reviewed_by`.
  - `DELETE /manage-feedback/:id` — Soft deletes by stamping `deleted_at` and forcing status `closed`.
- **Notes**: All list/detail responses enrich user names from `profiles` to support richer UI labels.

## Feature Flag Controls

Feature flags live in the `ai_configurations` table. Each super admin receives a `feature_flags` configuration row (merged on insert).

```json
{
  "feedback_enabled": true,
  "feedback_auto_email": true,
  "feedback_widget": false
}
```

| Flag | Description |
| --- | --- |
| `feedback_enabled` | Master switch. Hides navigation, disables submission route, and blocks edge function writes. |
| `feedback_auto_email` | When `true`, triggers thank-you emails after each submission. |
| `feedback_widget` | Toggles the floating quick-access widget in both standard and admin layouts. |

Update the flag through `ai_configurations` or use the Admin Settings panel once UI controls are added.

## Reuse Checklist

- [x] **Edge Functions** isolated from the main app server and rely only on Supabase services.
- [x] **Supabase Storage** keeps attachments private (`feedback` bucket with owner-scoped RLS policies).
- [x] **React Components** lazily loaded and scoped to `/feedback/submit` and `/adminpanel/feedback` routes.
- [x] **Feature Flags** make it easy to toggle the module on/off or enable the optional floating widget across other SJ Innovation platforms.
- [x] **Schema & Policies** reside in a single migration, making the module portable to other Supabase-backed projects.

Reuse this module by copying the migration, edge functions, and React feature directory into the target platform, then toggling the flags in `ai_configurations`.

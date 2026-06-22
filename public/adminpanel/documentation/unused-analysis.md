# Unused Analysis

_Last Updated: 2025-02-18_

This audit highlights code paths and database structures that are present in the repository but are not currently exercised by the production UI or automations.

## Frontend Modules
- `src/components/documentation/DocSidebar.tsx` — superseded by the tabbed documentation layout; no imports remain.
- `src/components/documentation/MarkdownRenderer.tsx` and `CodeBlock.tsx` — legacy Markdown rendering helpers replaced by `react-markdown` inside `src/pages/admin/Documentation.tsx`.
- `src/components/documentation/TableOfContents.tsx` — never wired into the Admin Panel; a future enhancement could repurpose it for long-form docs.

## Edge Functions & API Surfaces
- `supabase/functions/import-hours` — CSV ingestion utility for billable hours; no UI or scheduled job calls this endpoint.
- `supabase/functions/openai-test` — diagnostics endpoint that should stay disabled outside staging.
- `supabase/functions/manage-followups` — follow-up orchestration exists but no frontend workflow triggers it yet.

## Database Entities
- `brand_analytics_data` — populated by the n8n webhook but not surfaced in any charts; consider building analytics dashboards to visualise these metrics.
- `ai_shared_resources` — receives vector store references from `create-company-vector-store` and `linkedin-upload-file-to-openai`, yet no UI currently lists or manages these assets.
- `team_daily_summaries.productivity_score` — calculated by AI summarisation but unused downstream; potential KPI for leadership dashboards.
- `feedback_reports.deleted_at` — soft-delete column is never set because the UI only supports status changes; evaluate whether to expose archival actions or remove the column.

## Recommendations
1. **Decide on Documentation Navigation Enhancements:** Either delete the unused documentation components or reintegrate them as a secondary navigation pane for larger manuals.
2. **Surface Analytics & AI Artefacts:** Build admin widgets to visualise `brand_analytics_data` metrics and expose `ai_shared_resources` so admins can manage vector stores.
3. **Clarify Feedback Lifecycle:** Extend the feedback triage UI to support soft deletes or remove the redundant `deleted_at` column to reduce confusion.
4. **Productise Follow-Up Automations:** If the follow-up workflow is required, add frontend controls (e.g., within deal detail views) to trigger `manage-followups`; otherwise archive the function.

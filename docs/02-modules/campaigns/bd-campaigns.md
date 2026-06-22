# BD Campaign Management Reference

## Route overview
- **Primary route:** `/bd/strategy/campaigns`, registered in `src/App.tsx` and rendered by `src/pages/bd/CampaignManagement.tsx`.
- **UI responsibilities:** surfaces aggregate outreach metrics, filters/search, and campaign cards that link to `/bd/strategy/campaigns/:id` for drill-downs. It also hosts the `CampaignDialog` create flow.
- **State management:** pagination is handled through `usePagination`, while campaign/niche data is loaded through React Query hooks.

## `useBDCampaigns` contract
`useBDCampaigns(nicheId?, page = 1, limit = 12)` wraps the Admin Campaigns API and returns:
- `campaigns`: `BDCampaign[]` (`CampaignSummary` from `src/Api/adminCampaigns.ts`) with fields for identifiers, ownership, per-channel stats (`linkedin_stats`, `ghl_stats`), outreach totals, and optional brand/profile metadata.
- `total`: total number of campaigns matching the current filters.
- `isLoading` / `error`: React Query status flags for loading and failure states.
- `refetch`: re-issue the list query (used by the Campaign Management error state retry button).
- `createCampaign`, `updateCampaign`, `deleteCampaign`: React Query mutations that optimistically update the list and surface toast feedback.

Key payload shapes live in `src/Api/adminCampaigns.ts`:
- `CampaignPayload`: fields accepted when creating a campaign (type, status, IDs, stats, ownership, etc.).
- `CampaignUpdateRequest`: partial payload + optional `metrics` bundle for analytics inserts.
- `CampaignListResponse`: `{ data, total, page, pageSize }` envelope returned by `listCampaigns`.

## Supabase edge functions & endpoints
All network calls are funneled through `src/Api/adminCampaigns.ts`, which uses the authenticated Axios client to hit Supabase edge functions:
- `GET /admin-campaigns/list` → `listCampaigns` (paginated summaries).
- `GET /admin-campaigns/:id` → `getCampaignDetail` (detail view hook).
- `POST /admin-campaigns` → `createCampaign` (optionally seeds KPIs/tasks via `CampaignCreateOptions`).
- `PUT /admin-campaigns/:id` → `updateCampaign` (campaign + metric updates).
- `DELETE /admin-campaigns/:id` → `archiveCampaign` (soft-delete/archival).

These routes are implemented in `supabase/functions/admin-campaigns`, with auxiliary automation in `supabase/functions/admin-campaigns-exa-research` and shared helpers under `supabase/functions/_shared/`. Supporting tables and triggers are defined in the campaign migrations under `supabase/migrations/` (for example `20251215100000_create_campaigns.sql`). Consult those files when adjusting the data contract or seeding behaviour.

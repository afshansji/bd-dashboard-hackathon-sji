# Migration 20251215100000 – Campaigns v2 rollout

## Summary
- Adds the `public.campaigns` table with v2 fields (owner, objective, budget tracking, JSONB metrics/metadata, audit columns).
- Introduces `public.campaign_channels` as a lookup for `campaigns.primary_channel`.
- Seeds default KPI records for a campaign's brand via `public.seed_campaign_default_kpis()`.
- Backfills legacy `public.bd_campaigns` rows into the new schema and repoints related tables.
- Normalizes `user_permissions` so `module_name = 'campaigns'` reflects updated RLS policies.

## Deployment
1. Ensure Supabase CLI is authenticated and run `supabase db reset` in a staging project first.
2. Apply migrations: `supabase db push` (or `supabase migration up 20251215100000`).
3. Verify `campaigns` rows exist and that `campaign_contacts` / `campaign_activities` still resolve foreign keys.
4. Confirm `brand_kpis` gained default records for a freshly inserted campaign.

## Rollback
1. Drop foreign keys on `campaign_contacts` and `campaign_activities` that reference `public.campaigns`.
2. Delete migrated rows from `public.campaigns` (and re-enable the `bd_campaigns` foreign keys if required).
3. Recreate/restore the previous `bd_campaigns` structure and associated permissions.
4. Remove the `campaign_channels` table and `seed_campaign_default_kpis` trigger if reverting entirely.

Document any manual data corrections (e.g., budget targets) performed after deployment.

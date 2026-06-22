# Control Tower REST API Integration - Quick Start

## What This Is

Migration from direct Supabase-to-Supabase connections to the official Control Tower REST API for better security, rate limiting, and maintainability.

## What's New

### ✅ Implemented (Clients)
- **REST API Client** - Type-safe client for Control Tower API (`src/integrations/controlTower/restApiClient.ts`)
- **Sync Edge Function** - Pulls clients from API (`supabase/functions/sync-control-tower-clients-api/`)
- **Database Tracking** - New columns to track API-synced clients
- **Admin UI** - "🏢 Sync Clients API" button in Control Tower dashboard
- **Frontend Hooks** - `useControlTowerClientsAPI()` and `useSyncControlTowerClientsAPI()`

### ⏳ Pending (Leads)
- **Lead API** - Not yet available in Control Tower REST API
- **Strategy** - Continue using direct Supabase access for leads temporarily
- **See:** `docs/LEAD_API_MIGRATION_STRATEGY.md` for full details

## Quick Start

### 1. Verify API Key

```bash
curl -X GET \
  'https://ttlmdbgptqlvjswtcrnq.supabase.co/functions/v1/validate-api-key?scope=clients' \
  -H 'Authorization: Bearer sk_your_api_key_here'
```

**Expected:** `"valid": true` with `"scopes": ["clients"]`

### 2. Run Database Migrations

```bash
cd /home/user/sj-bd-dashboard
supabase db reset  # Or apply specific migrations
```

**Migrations Applied:**
- `20251222000000_control_tower_rest_api_config.sql` - Config schema
- `20251222000100_clients_api_tracking_fields.sql` - Client tracking fields

### 3. Set Environment Variables

```bash
supabase secrets set CONTROLTOWERAPIKEY=sk_your_api_key_here
supabase secrets set CONTROL_TOWER_API_URL=https://ttlmdbgptqlvjswtcrnq.supabase.co/functions/v1
```

### 4. Test Sync

**Option A: Via Admin UI**
1. Navigate to Admin > Control Tower Sync
2. Click "🏢 Sync Clients API" button
3. Wait for completion
4. Check toast notification for results

**Option B: Via CLI**
```bash
supabase functions invoke sync-control-tower-clients-api \
  --headers '{"Authorization": "Bearer <admin-user-token>"}'
```

### 5. Verify Data

```sql
-- Count clients synced via API
SELECT COUNT(*) as api_synced_clients
FROM clients
WHERE synced_from_control_tower_api = true;

-- View recent syncs
SELECT sync_type, status, records_synced, duration_ms, synced_at
FROM control_tower_sync_log
WHERE sync_type = 'pull_clients_api'
ORDER BY synced_at DESC
LIMIT 5;
```

## File Structure

```
sj-bd-dashboard/
├── docs/
│   ├── CONTROL_TOWER_REST_API_INTEGRATION.md  ← Full documentation
│   ├── LEAD_API_MIGRATION_STRATEGY.md         ← Lead migration strategy
│   └── CONTROL_TOWER_REST_API_README.md       ← This file
│
├── src/
│   ├── integrations/controlTower/
│   │   ├── restApiClient.ts                   ← REST API client class
│   │   └── client.ts                          ← Legacy Supabase client
│   │
│   ├── hooks/
│   │   └── useControlTowerData.tsx            ← Updated hooks
│   │
│   └── pages/admin/
│       └── ControlTowerSyncDashboard.tsx      ← Updated dashboard
│
└── supabase/
    ├── migrations/
    │   ├── 20251222000000_control_tower_rest_api_config.sql
    │   └── 20251222000100_clients_api_tracking_fields.sql
    │
    └── functions/
        └── sync-control-tower-clients-api/
            └── index.ts                        ← Sync edge function
```

## Key Concepts

### Data Flow

1. **Sync Trigger**
   - User clicks "🏢 Sync Clients API" button
   - OR scheduled cron job runs (future)

2. **API Fetch**
   - Edge function calls Control Tower REST API
   - Fetches all pages (pagination supported)
   - Handles rate limits automatically

3. **Data Transform**
   - Maps API response to local schema
   - Adds tracking fields (`control_tower_client_id`, etc.)

4. **Upsert**
   - Checks if client exists by `control_tower_client_id`
   - Updates existing or inserts new
   - Prevents duplicates

5. **Frontend Read**
   - `useControlTowerClientsAPI()` queries LOCAL database
   - Filters by `synced_from_control_tower_api = true`
   - Fast queries (no API calls on read)

### Feature Flags

Configuration in `ai_configurations` table:

```json
{
  "use_rest_api": true,        // Use REST API for clients
  "use_api_for_leads": false   // Continue direct access for leads
}
```

**Migration Path:**
1. **Now:** `use_rest_api = true` for clients only
2. **Future:** `use_api_for_leads = true` when Lead API is available
3. **Eventual:** Remove direct Supabase access entirely

## Monitoring

### Check Sync Status

```sql
SELECT
  sync_type,
  status,
  started_at,
  completed_at,
  metadata->'clients_synced' as clients_synced
FROM control_tower_sync_status
WHERE sync_type = 'clients_api';
```

### View Sync Logs

```sql
SELECT
  sync_type,
  status,
  records_synced,
  records_failed,
  duration_ms,
  synced_at,
  metadata->'new' as new_clients,
  metadata->'updated' as updated_clients,
  metadata->'rate_limit' as rate_limit
FROM control_tower_sync_log
WHERE sync_type = 'pull_clients_api'
ORDER BY synced_at DESC
LIMIT 10;
```

### Rate Limit Check

```sql
SELECT
  (metadata->'rate_limit'->>'remaining')::int as remaining,
  (metadata->'rate_limit'->>'limit')::int as total_limit,
  metadata->'rate_limit'->>'reset' as reset_time
FROM control_tower_sync_log
WHERE sync_type = 'pull_clients_api'
  AND metadata->'rate_limit' IS NOT NULL
ORDER BY synced_at DESC
LIMIT 1;
```

## Troubleshooting

### Problem: API Key Invalid

**Error:** `invalid_key` or `expired_key`

**Solution:**
```bash
# Check if secret is set
supabase secrets list | grep CONTROLTOWERAPIKEY

# Test directly
curl -X GET \
  'https://ttlmdbgptqlvjswtcrnq.supabase.co/functions/v1/validate-api-key' \
  -H 'Authorization: Bearer sk_test...'

# Update if needed
supabase secrets set CONTROLTOWERAPIKEY=sk_new_key
```

### Problem: Sync Button Doesn't Work

**Debugging:**
1. Check browser console for errors
2. Verify user is authenticated (admin role)
3. Check edge function logs:
   ```bash
   supabase functions logs sync-control-tower-clients-api --tail
   ```

### Problem: Duplicate Clients

**Check:**
```sql
SELECT control_tower_client_id, COUNT(*)
FROM clients
WHERE control_tower_client_id IS NOT NULL
GROUP BY control_tower_client_id
HAVING COUNT(*) > 1;
```

**Fix:** See "Troubleshooting > Duplicate Clients" in full documentation

### Problem: Rate Limit Hit

**Check:**
```sql
SELECT
  error_message,
  metadata->'rate_limit'
FROM control_tower_sync_log
WHERE sync_type = 'pull_clients_api'
  AND error_message LIKE '%rate limit%'
ORDER BY synced_at DESC
LIMIT 1;
```

**Solution:**
- Wait for rate limit reset (check `X-RateLimit-Reset` header)
- Reduce sync frequency
- Request higher rate limit from Control Tower team

## Next Steps

### Immediate
- [x] Test sync with production data
- [ ] Set up scheduled syncs (cron)
- [ ] Monitor rate limit usage
- [ ] Validate data parity with direct Supabase

### Short-term
- [ ] Request Lead API from Control Tower team
- [ ] Implement Deals API sync (similar pattern)
- [ ] Add webhooks for real-time updates
- [ ] Create admin alerts for sync failures

### Long-term
- [ ] Migrate Leads to REST API (when available)
- [ ] Deprecate direct Supabase access
- [ ] Implement bi-directional sync
- [ ] Add conflict resolution

## Documentation

| Document | Purpose |
|----------|---------|
| `CONTROL_TOWER_REST_API_README.md` | This file - Quick start guide |
| `CONTROL_TOWER_REST_API_INTEGRATION.md` | Complete technical documentation |
| `LEAD_API_MIGRATION_STRATEGY.md` | Lead migration strategy and timeline |

## Support

**Questions?**
- Check full documentation: `docs/CONTROL_TOWER_REST_API_INTEGRATION.md`
- Check Lead strategy: `docs/LEAD_API_MIGRATION_STRATEGY.md`
- Review code: `src/integrations/controlTower/restApiClient.ts`

**Issues?**
- Check edge function logs: `supabase functions logs sync-control-tower-clients-api`
- Check sync logs: Query `control_tower_sync_log` table
- Review troubleshooting section in full documentation

**Feature Requests?**
- Contact BD Portal development team
- Submit GitHub issue/PR
- Document in team discussions

---

## Summary

✅ **What's Working:**
- Client sync via REST API
- Rate limit handling
- Error tracking and logging
- Admin UI integration
- Local data caching

⏳ **What's Pending:**
- Lead API (waiting on Control Tower team)
- Automatic scheduling
- Bi-directional sync

🎯 **Goal:**
Replace all direct Supabase-to-Supabase connections with official REST API for better security, monitoring, and scalability.

---

*Last Updated: 2025-12-22*
*Version: 1.0.0*

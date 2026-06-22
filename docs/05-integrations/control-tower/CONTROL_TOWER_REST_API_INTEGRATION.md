# Control Tower REST API Integration

## Overview

This document describes the Control Tower REST API integration for the BD Portal, which replaces direct Supabase-to-Supabase connections with official Control Tower REST API endpoints.

## Architecture

### Before (Direct Supabase Access)
```
BD Portal Frontend
    ↓ (Supabase Client)
Control Tower Database
```

**Problems:**
- Direct database credentials exposure
- No rate limiting
- No official API contract
- Security risks
- Difficult to monitor/audit

### After (REST API Access)
```
BD Portal Frontend
    ↓ (UI)
BD Portal Supabase Database (Local Cache)
    ↑ (Sync via Edge Function)
Control Tower REST API
    ↓ (Official API)
Control Tower Database
```

**Benefits:**
- ✅ Secure API key authentication with scopes
- ✅ Built-in rate limiting
- ✅ Official API contracts and documentation
- ✅ Local data caching for fast queries
- ✅ Better monitoring and auditing
- ✅ Multi-tenant support ready

## Components

### 1. REST API Client (`src/integrations/controlTower/restApiClient.ts`)

Centralized client for all Control Tower REST API calls.

**Key Features:**
- Bearer token authentication
- Automatic rate limit handling
- Retry logic with exponential backoff
- Type-safe request/response interfaces
- Error code mapping

**Usage Example:**
```typescript
import { createControlTowerAPIClient } from '@/integrations/controlTower/restApiClient';

const client = createControlTowerAPIClient({
  baseUrl: 'https://ttlmdbgptqlvjswtcrnq.supabase.co/functions/v1',
  apiKey: process.env.CONTROLTOWERAPIKEY,
  version: 'v1'
});

// List clients with pagination
const response = await client.listClients({
  page: 1,
  limit: 100,
  status: 'active'
});

console.log(`Found ${response.data.pagination.total_items} clients`);
console.log(`Rate limit: ${response.rateLimit.remaining}/${response.rateLimit.limit}`);
```

**Available Methods:**

#### Utility
- `validateAPIKey(params?)` - Validate API key and check scopes
- `getRateLimitInfo()` - Get current rate limit status

#### Clients API
- `listClients(params?)` - List all clients with pagination
- `getClientById(id)` - Get single client
- `createClient(data)` - Create new client
- `updateClient(id, data)` - Update client
- `deleteClient(id)` - Delete client

#### Future: Leads API
- `listLeads()` - Placeholder (API not available yet)
- See `docs/LEAD_API_MIGRATION_STRATEGY.md` for details

---

### 2. Database Schema Updates

#### Configuration (`ai_configurations` table)

Extended to support REST API settings:

```json
{
  "url": "https://...",              // Legacy: Direct Supabase URL
  "anon_key": "...",                  // Legacy: Direct Supabase anon key
  "is_active": true,                  // Whether config is active

  // NEW REST API fields:
  "api_url": "https://ttlmdbgptqlvjswtcrnq.supabase.co/functions/v1",
  "api_key_encrypted": "...",         // Encrypted API key
  "api_version": "v1",                // API version
  "use_rest_api": false               // Feature flag for gradual migration
}
```

**Migration:** `20251222000000_control_tower_rest_api_config.sql`

#### Clients Table

Added API tracking fields:

```sql
ALTER TABLE clients
ADD COLUMN control_tower_client_id TEXT UNIQUE,
ADD COLUMN synced_from_control_tower_api BOOLEAN DEFAULT FALSE,
ADD COLUMN last_api_sync_at TIMESTAMPTZ;
```

**Indexes:**
- `idx_clients_ct_api_id` - Fast lookups by Control Tower ID
- `idx_clients_synced_from_api` - Filter synced clients
- `unique_control_tower_client_id` - Prevent duplicate syncs

**Migration:** `20251222000100_clients_api_tracking_fields.sql`

---

### 3. Edge Function: `sync-control-tower-clients-api`

Pulls clients from Control Tower REST API and syncs to local database.

**Location:** `supabase/functions/sync-control-tower-clients-api/index.ts`

**Process Flow:**
1. **Authenticate** with Control Tower API
2. **Fetch** all clients with pagination (100 per page)
3. **Transform** API response to local schema
4. **Upsert** to `clients` table (by `control_tower_client_id`)
5. **Log** sync results to `control_tower_sync_log`
6. **Track** progress in `control_tower_sync_status`

**Invocation:**
```bash
# Via Supabase CLI
supabase functions invoke sync-control-tower-clients-api \
  --headers '{"Authorization": "Bearer <user-token>"}'

# Via Frontend
const { data } = await supabase.functions.invoke(
  'sync-control-tower-clients-api',
  { method: 'POST' }
);
```

**Response:**
```json
{
  "success": true,
  "result": {
    "clients": {
      "new": 25,
      "updated": 75,
      "skipped": 5,
      "failed": 0,
      "total_fetched": 105
    },
    "rateLimit": {
      "limit": 1000,
      "remaining": 945,
      "reset": "2025-12-22T18:00:00Z"
    },
    "errors": [],
    "warnings": [],
    "duration": 12500,
    "pages_fetched": 2
  }
}
```

**Error Handling:**

| Error Code | HTTP Status | Behavior |
|------------|-------------|----------|
| `missing_api_key` | 401 | Log critical error, fail sync |
| `invalid_key` | 401 | Log critical error, fail sync |
| `expired_key` | 401 | Log critical error, notify admin |
| `insufficient_scope` | 403 | Log error, notify to add `clients` scope |
| `rate_limit_exceeded` | 429 | Wait for reset, retry |
| `validation_error` | 400 | Skip record, log warning |
| `database_error` | 500 | Retry up to 3 times |
| `internal_error` | 500 | Retry up to 3 times |

**Rate Limit Handling:**
- Monitors `X-RateLimit-Remaining` header
- Waits if < 10 requests remaining
- Logs warnings when approaching limit
- Respects `X-RateLimit-Reset` timestamp

---

### 4. Frontend Hooks

#### `useControlTowerClientsAPI(page, limit)`

Queries local database for synced clients.

```typescript
import { useControlTowerClientsAPI } from '@/hooks/useControlTowerData';

function ClientsList() {
  const { data, isLoading } = useControlTowerClientsAPI(1, 25);

  if (isLoading) return <Loader />;

  return (
    <div>
      <h2>Clients ({data.total})</h2>
      {data.data.map(client => (
        <ClientCard key={client.id} client={client} />
      ))}
    </div>
  );
}
```

**Note:** This reads from LOCAL database (`clients` table) where `synced_from_control_tower_api = true`. Data is refreshed via sync function.

#### `useSyncControlTowerClientsAPI()`

Triggers manual sync from REST API.

```typescript
import { useSyncControlTowerClientsAPI } from '@/hooks/useControlTowerData';

function SyncButton() {
  const { mutate: syncClients, isPending } = useSyncControlTowerClientsAPI();

  return (
    <Button
      onClick={() => syncClients()}
      disabled={isPending}
    >
      {isPending ? 'Syncing...' : 'Sync Clients'}
    </Button>
  );
}
```

**Auto-refresh:** Queries are automatically invalidated after successful sync.

---

### 5. Admin Dashboard Integration

#### Location
`src/pages/admin/ControlTowerSyncDashboard.tsx`

#### New Button: "🏢 Sync Clients API"

Located in the "Manual Sync" card alongside other sync operations.

**Features:**
- Shows loading state during sync
- Displays success toast with sync results
- Shows error toast on failure
- Refreshes dashboard data after sync
- Disabled during active sync operations

**Usage:**
1. Navigate to Admin > Control Tower Sync
2. Click "🏢 Sync Clients API" button
3. Wait for sync to complete
4. View results in toast notification
5. Check "Sync History" tab for detailed logs

---

## Configuration

### Environment Variables

**Edge Function (Supabase Secrets):**
```bash
# Control Tower API base URL
CONTROL_TOWER_API_URL=https://ttlmdbgptqlvjswtcrnq.supabase.co/functions/v1

# Control Tower API key (requires 'clients' scope)
CONTROLTOWERAPIKEY=sk_your_api_key_here
```

**Set via Supabase CLI:**
```bash
supabase secrets set CONTROLTOWERAPIKEY=sk_your_api_key_here
supabase secrets set CONTROL_TOWER_API_URL=https://ttlmdbgptqlvjswtcrnq.supabase.co/functions/v1
```

**Frontend (Optional - for direct API calls):**
```env
VITE_CONTROL_TOWER_API_URL=https://ttlmdbgptqlvjswtcrnq.supabase.co/functions/v1
```

### API Key Scopes

Required scopes for the API key:
- ✅ `clients` - Read and write access to client data

**Validate API Key:**
```bash
curl -X GET \
  'https://ttlmdbgptqlvjswtcrnq.supabase.co/functions/v1/validate-api-key?scope=clients' \
  -H 'Authorization: Bearer sk_your_api_key_here'
```

**Expected Response:**
```json
{
  "valid": true,
  "key_type": "live",
  "scopes": ["clients", "deals", "projects"],
  "rate_limit": {
    "limit": 1000,
    "remaining": 999,
    "reset": "2025-12-22T18:00:00Z"
  }
}
```

---

## Migration Guide

### Phase 1: Setup (Complete)
- [x] Create `ControlTowerAPIClient` class
- [x] Add database schema migrations
- [x] Create `sync-control-tower-clients-api` edge function
- [x] Add frontend hooks and UI components

### Phase 2: Testing (Recommended Before Production)
1. **Validate API Key**
   ```bash
   supabase functions invoke sync-control-tower-clients-api \
     --headers '{"Authorization": "Bearer <admin-token>"}'
   ```

2. **Run Test Sync**
   - Navigate to Admin > Control Tower Sync
   - Click "🏢 Sync Clients API"
   - Verify clients appear in database
   - Check `control_tower_client_id` is populated

3. **Verify Data Parity**
   ```sql
   -- Count clients synced via API
   SELECT COUNT(*) FROM clients WHERE synced_from_control_tower_api = true;

   -- Compare with direct Supabase count
   -- (Query Control Tower database directly)
   ```

4. **Test Update Logic**
   - Run sync twice
   - Verify no duplicates created
   - Verify updates are applied

### Phase 3: Gradual Rollout
1. **Enable for Admins Only**
   - Use "🏢 Sync Clients API" button manually
   - Monitor sync logs and errors
   - Validate data quality

2. **Enable Feature Flag**
   ```sql
   UPDATE ai_configurations
   SET configuration_data = jsonb_set(
     configuration_data,
     '{use_rest_api}',
     'true'
   )
   WHERE configuration_type = 'control_tower';
   ```

3. **Schedule Automatic Syncs** (Future)
   - Create cron job to run sync every hour
   - Use Supabase cron or external scheduler

### Phase 4: Deprecation (Future)
1. Remove direct Supabase client usage for clients
2. Remove `url` and `anon_key` from config (keep for leads)
3. Update documentation
4. Celebrate! 🎉

---

## Monitoring and Debugging

### Sync Logs

**View recent syncs:**
```sql
SELECT
  sync_type,
  status,
  records_synced,
  records_failed,
  duration_ms,
  synced_at,
  error_message,
  metadata
FROM control_tower_sync_log
WHERE sync_type = 'pull_clients_api'
ORDER BY synced_at DESC
LIMIT 10;
```

**Check sync status:**
```sql
SELECT
  sync_type,
  status,
  started_at,
  completed_at,
  metadata
FROM control_tower_sync_status
WHERE sync_type = 'clients_api';
```

### Rate Limit Monitoring

**Check last sync rate limit:**
```sql
SELECT
  metadata->'rate_limit' as rate_limit,
  synced_at
FROM control_tower_sync_log
WHERE sync_type = 'pull_clients_api'
  AND metadata->'rate_limit' IS NOT NULL
ORDER BY synced_at DESC
LIMIT 1;
```

### Error Tracking

**View failed syncs:**
```sql
SELECT
  synced_at,
  error_message,
  metadata->'errors' as errors,
  records_failed
FROM control_tower_sync_log
WHERE sync_type = 'pull_clients_api'
  AND status IN ('failed', 'partial_success')
ORDER BY synced_at DESC;
```

### Performance Metrics

**Average sync duration:**
```sql
SELECT
  AVG(duration_ms) as avg_duration_ms,
  MAX(duration_ms) as max_duration_ms,
  MIN(duration_ms) as min_duration_ms,
  COUNT(*) as total_syncs
FROM control_tower_sync_log
WHERE sync_type = 'pull_clients_api'
  AND status = 'success'
  AND synced_at > NOW() - INTERVAL '7 days';
```

---

## Troubleshooting

### API Key Issues

**Problem:** `invalid_key` or `expired_key` error

**Solution:**
1. Verify API key is set correctly:
   ```bash
   supabase secrets list | grep CONTROLTOWERAPIKEY
   ```

2. Test API key directly:
   ```bash
   curl -X GET \
     'https://ttlmdbgptqlvjswtcrnq.supabase.co/functions/v1/validate-api-key' \
     -H 'Authorization: Bearer sk_your_api_key_here'
   ```

3. Contact Control Tower team for new API key if expired

### Insufficient Scope

**Problem:** `insufficient_scope` error

**Solution:**
1. Check current scopes:
   ```bash
   curl -X GET \
     'https://ttlmdbgptqlvjswtcrnq.supabase.co/functions/v1/validate-api-key' \
     -H 'Authorization: Bearer sk_your_api_key_here'
   ```

2. Request `clients` scope from Control Tower team

3. Update API key in Supabase secrets

### Rate Limit Exceeded

**Problem:** `rate_limit_exceeded` error

**Solution:**
1. Check rate limit reset time in error message
2. Wait for reset (usually 1 hour)
3. Reduce sync frequency if hitting limits regularly
4. Request higher rate limit from Control Tower team

### Duplicate Clients

**Problem:** Same client synced multiple times

**Solution:**
1. Check unique constraint:
   ```sql
   SELECT control_tower_client_id, COUNT(*)
   FROM clients
   WHERE control_tower_client_id IS NOT NULL
   GROUP BY control_tower_client_id
   HAVING COUNT(*) > 1;
   ```

2. If duplicates exist, manually deduplicate:
   ```sql
   -- Keep first occurrence, delete rest
   DELETE FROM clients
   WHERE id IN (
     SELECT id
     FROM (
       SELECT id,
         ROW_NUMBER() OVER (PARTITION BY control_tower_client_id ORDER BY created_at) as rn
       FROM clients
       WHERE control_tower_client_id IS NOT NULL
     ) t
     WHERE rn > 1
   );
   ```

### Sync Never Completes

**Problem:** Sync status stuck in "running"

**Solution:**
1. Check edge function logs:
   ```bash
   supabase functions logs sync-control-tower-clients-api
   ```

2. Check for rate limit waits (can take time)

3. Manually update status if truly stuck:
   ```sql
   UPDATE control_tower_sync_status
   SET status = 'failed',
       metadata = jsonb_set(
         metadata,
         '{error}',
         '"Manual intervention - sync appeared stuck"'
       )
   WHERE sync_type = 'clients_api'
     AND status = 'running'
     AND started_at < NOW() - INTERVAL '1 hour';
   ```

---

## API Reference

### Control Tower REST API

**Base URL:** `https://ttlmdbgptqlvjswtcrnq.supabase.co/functions/v1`

**Authentication:** Bearer token
```
Authorization: Bearer sk_your_api_key_here
```

### Endpoints

#### Validate API Key
```http
GET /validate-api-key?scope={scope}
```

**Response:**
```json
{
  "valid": true,
  "key_type": "live",
  "scopes": ["clients"],
  "rate_limit": {
    "limit": 1000,
    "remaining": 999,
    "reset": "2025-12-22T18:00:00Z"
  }
}
```

#### List Clients
```http
GET /api-v1-clients?page={page}&limit={limit}&search={search}&status={status}
```

**Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page, max 100 (default: 25)
- `search` (optional): Search by name, email, company
- `status` (optional): Filter by status (active, inactive, archived)

**Response:**
```json
{
  "clients": [
    {
      "id": "uuid",
      "name": "Acme Corp",
      "email": "contact@acme.com",
      "company": "Acme Corporation",
      "phone": "+1-555-0100",
      "status": "active",
      "website": "https://acme.com",
      "industry": "Technology",
      "contact_person": "John Doe",
      "address": "123 Main St, City, State 12345",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-12-22T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total_items": 156,
    "total_pages": 7,
    "has_next_page": true,
    "has_previous_page": false
  }
}
```

**Rate Limit Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 945
X-RateLimit-Reset: 2025-12-22T18:00:00Z
```

#### Get Client by ID
```http
GET /api-v1-clients/{id}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Acme Corp",
  ...
}
```

#### Create Client
```http
POST /api-v1-clients
Content-Type: application/json

{
  "name": "New Client",
  "email": "contact@newclient.com",
  "company": "New Client Inc",
  "status": "active"
}
```

#### Update Client
```http
PATCH /api-v1-clients/{id}
Content-Type: application/json

{
  "status": "inactive"
}
```

#### Delete Client
```http
DELETE /api-v1-clients/{id}
```

---

## Future Enhancements

### Planned
1. **Lead API Integration** (when available)
   - See `docs/LEAD_API_MIGRATION_STRATEGY.md`

2. **Deals API Integration**
   - Use existing `/api-v1-deals` endpoints
   - Similar pattern to client sync

3. **Webhook Support**
   - Real-time updates from Control Tower
   - Reduces need for polling/scheduled syncs

4. **Automatic Sync Scheduling**
   - Cron job for hourly/daily syncs
   - Configurable sync frequency

5. **Conflict Resolution**
   - Handle simultaneous updates
   - Merge strategies for conflicting data

### Under Consideration
1. Bi-directional sync (push local changes to Control Tower)
2. Incremental sync (only fetch changed records)
3. Real-time sync status dashboard
4. Admin notifications for sync failures

---

## Resources

### Documentation
- [Lead API Migration Strategy](./LEAD_API_MIGRATION_STRATEGY.md)
- [Control Tower API Docs](https://ttlmdbgptqlvjswtcrnq.supabase.co/functions/v1/docs) (if available)

### Code Locations
- **API Client:** `src/integrations/controlTower/restApiClient.ts`
- **Edge Function:** `supabase/functions/sync-control-tower-clients-api/index.ts`
- **Hooks:** `src/hooks/useControlTowerData.tsx`
- **Admin UI:** `src/pages/admin/ControlTowerSyncDashboard.tsx`
- **Migrations:**
  - `supabase/migrations/20251222000000_control_tower_rest_api_config.sql`
  - `supabase/migrations/20251222000100_clients_api_tracking_fields.sql`

### Contact
- **For API Issues:** Control Tower Team
- **For BD Portal Issues:** BD Portal Development Team
- **For This Documentation:** [maintainer contact]

---

## Changelog

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-12-22 | 1.0.0 | Initial implementation - Client sync via REST API | BD Portal Team |
| TBD | 1.1.0 | Add Lead API support (when available) | TBD |
| TBD | 2.0.0 | Full migration, deprecate direct Supabase access | TBD |

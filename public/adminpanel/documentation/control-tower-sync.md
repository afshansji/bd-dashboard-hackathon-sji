# Control Tower Synchronization

## Overview
The Control Tower Sync module enables **bi-directional data synchronization** between the SJ Business Development Portal and the external Control Tower CRM system. It ensures deal data flows seamlessly while maintaining data integrity and audit trails.

## Architecture

### Data Flow
```
┌─────────────────────┐         ┌──────────────────────┐
│  Control Tower CRM  │ ◄─────► │  BD Portal (Supabase) │
│  (External System)  │  Hourly │                      │
└─────────────────────┘   Sync  └──────────────────────┘
         │                              │
         ├── Pull: Deals Data           ├── Push: Comments
         ├── Pull: Client Info          ├── Push: Checklist
         └── Pull: Deal Updates         └── Push: Stage Changes
```

### Sync Types

#### **1. PULL SYNC (Control Tower → BD Portal)**
- **Frequency:** Hourly (cron job)
- **Edge Function:** `sync-control-tower-deals`
- **Data Synced:**
  - New deals
  - Deal updates (stage, owner, amount, dates)
  - Client information
  - HubSpot metadata
  - External links (N8N, ActiveCollab, CollabAI)

#### **2. PUSH SYNC (BD Portal → Control Tower)**
- **Frequency:** Hourly (cron job) + Manual trigger
- **Edge Function:** `push-to-control-tower`
- **Data Synced:**
  - New comments (with @mentions)
  - Checklist item completions
  - Deal stage changes (future)
  - Deal owner reassignments (future)

## Database Schema

### New Tables

#### **`control_tower_sync_log`**
Audit trail for all sync operations.

**Columns:**
- `id` (UUID): Primary key
- `sync_type` (TEXT): 'pull' or 'push'
- `entity_type` (TEXT): 'deal', 'comment', 'checklist', 'stage_change'
- `entity_id` (UUID): Local entity ID
- `control_tower_id` (TEXT): Control Tower entity ID
- `status` (TEXT): 'success', 'failed', 'pending'
- `payload` (JSONB): Sync data snapshot
- `error_message` (TEXT): Error details if failed
- `synced_at` (TIMESTAMP): Sync timestamp
- `synced_by` (UUID): User who triggered sync

**Indexes:**
- `idx_sync_log_status` (status, synced_at DESC)
- `idx_sync_log_entity` (entity_type, entity_id)
- `idx_sync_log_ct_id` (control_tower_id)

### Enhanced Tables

#### **`deals` Table Additions**
```sql
-- Control Tower metadata storage
control_tower_metadata JSONB DEFAULT '{}'::jsonb
notes TEXT
hubspot_deal_id TEXT
hubspot_crm_deal_url TEXT
dealtype TEXT
lead_source TEXT
expected_closing_date DATE
potential_amount NUMERIC
priority TEXT DEFAULT 'medium'
tags TEXT[] DEFAULT '{}'
external_links JSONB DEFAULT '{}'::jsonb
last_activity_at TIMESTAMP WITH TIME ZONE
last_activity_by UUID
```

**`external_links` Structure:**
```json
{
  "n8n_workflow_url": "https://n8n.example.com/workflow/123",
  "activecollab_project_url": "https://app.activecollab.com/123456"
}
```

#### **`deal_comments` Table Additions**
```sql
synced_to_control_tower BOOLEAN DEFAULT false
control_tower_comment_id TEXT
mentioned_users UUID[] DEFAULT '{}'
mentioned_user_emails TEXT[] DEFAULT '{}'
```

#### **`deal_checklist_items` Table Additions**
```sql
control_tower_synced_at TIMESTAMP WITH TIME ZONE
```

## Edge Functions

### **`sync-control-tower-deals` (Pull)**

**Purpose:** Fetch new/updated deals from Control Tower hourly.

**Process:**
1. Connect to Control Tower Supabase instance
2. Query deals modified since last sync
3. Map Control Tower fields to BD Portal schema
4. Store unmapped data in `control_tower_metadata` JSONB
5. Upsert deals (create or update)
6. Log sync results to `control_tower_sync_log`

**Field Mapping:**
| Control Tower Field | BD Portal Field | Notes |
|---------------------|----------------|-------|
| `deal_name` | `title` | Required |
| `stage` | `stage` | Maps to: prospecting, qualification, proposal, negotiation, closed_won, closed_lost |
| `value` / `potential_amount` | `amount` | Numeric |
| `owner_id` | `owner_id` | UUID reference |
| `hubspot_deal_id` | `hubspot_deal_id` | External ID |
| `hubspot_crm_deal_url` | `hubspot_crm_deal_url` | Direct link |
| `n8n_workflow_url` | `external_links.n8n_workflow_url` | JSONB nested |
| `activecollab_project_url` | `external_links.activecollab_project_url` | JSONB nested |
| `*` (unmapped fields) | `control_tower_metadata` | Full CT record stored |

**Cron Schedule:**
```sql
SELECT cron.schedule(
  'sync-control-tower-deals-hourly',
  '0 * * * *', -- Every hour at :00
  $$
  SELECT net.http_post(
    url:='https://qzzvcqoletuummdsbbio.supabase.co/functions/v1/sync-control-tower-deals',
    headers:='{"Authorization": "Bearer [SERVICE_ROLE_KEY]"}'::jsonb
  );
  $$
);
```

### **`push-to-control-tower` (Push)**

**Purpose:** Send BD Portal user actions back to Control Tower.

**Endpoint:** `/functions/v1/push-to-control-tower`

**Request Payload:**
```json
{
  "entity_type": "comment" | "checklist" | "stage_change" | "all",
  "entity_ids": ["uuid-1", "uuid-2"] // Optional: specific items
}
```

**Response:**
```json
{
  "comments": { "synced": 5, "failed": 0, "errors": [] },
  "checklist": { "synced": 3, "failed": 1, "errors": ["Item XYZ failed: ..."] },
  "stage_changes": { "synced": 0, "failed": 0, "errors": [] }
}
```

**Process:**

**1. Comments Sync:**
- Find unsynced comments (`synced_to_control_tower = false`)
- Push to Control Tower `deal_comments` table with:
  - `deal_id` (Control Tower ID)
  - `comment_text`
  - `user_email`, `user_name`
  - `mentioned_user_emails` array
  - `created_at`
- Mark as synced on success
- Log to `control_tower_sync_log`

**2. Checklist Sync:**
- Find completed but unsynced items (`is_completed = true AND control_tower_synced_at IS NULL`)
- Push to Control Tower `deal_checklist_updates` table
- Update `control_tower_synced_at` timestamp
- Log sync result

**Cron Schedule:**
```sql
SELECT cron.schedule(
  'push-to-control-tower-hourly',
  '30 * * * *', -- Every hour at :30 (offset from pull)
  $$
  SELECT net.http_post(
    url:='https://qzzvcqoletuummdsbbio.supabase.co/functions/v1/push-to-control-tower',
    headers:='{"Authorization": "Bearer [SERVICE_ROLE_KEY]"}'::jsonb,
    body:='{"entity_type": "all"}'::jsonb
  );
  $$
);
```

## Admin Dashboard

### Location
`/adminpanel/integrations/control-tower-sync`

### Features

#### **Sync Status Overview**
- Last Pull Sync: Timestamp, Status, Items Synced
- Last Push Sync: Timestamp, Status, Items Synced
- Pending Items: Comments (5), Checklist (3)
- Sync Health: Green/Yellow/Red indicator

#### **Manual Sync Triggers**
- **Pull Now** button → Immediately fetch from Control Tower
- **Push Now** button → Immediately send pending items
- Progress spinner during operation
- Toast notifications on success/failure

#### **Sync Log Table**
**Columns:**
- Sync Type (Pull/Push icon)
- Entity Type (Deal/Comment/Checklist badge)
- Status (Success/Failed badge with color)
- Timestamp
- Details (expand for payload/error)

**Filters:**
- Sync Type: All, Pull, Push
- Entity Type: All, Deal, Comment, Checklist
- Status: All, Success, Failed
- Date Range: Last 24h, 7d, 30d, Custom

#### **Configuration Panel**
- Enable/Disable Auto-Sync toggle
- Sync Frequency: Hourly (default), Every 2h, Every 4h
- Retry Failed Items: Yes/No
- Notification Preferences: Email on failures

## Troubleshooting

### Common Issues

**1. "Control Tower not configured" Error**
**Cause:** Missing integration credentials in `integrations` table.
**Fix:**
```sql
-- Check if Control Tower integration exists
SELECT * FROM integrations WHERE type = 'control_tower';

-- Update config if exists
UPDATE integrations 
SET config = '{"url": "https://ct.example.com", "anon_key": "your-key"}'::jsonb
WHERE type = 'control_tower';
```

**2. Comments Not Syncing**
**Cause:** `synced_to_control_tower` flag stuck at `false`.
**Fix:**
```sql
-- Check pending comments
SELECT id, created_at, synced_to_control_tower 
FROM deal_comments 
WHERE synced_to_control_tower = false
ORDER BY created_at DESC;

-- Manually trigger push sync
-- Visit /adminpanel/integrations/control-tower-sync
-- Click "Push Now" button
```

**3. Duplicate Deals Created**
**Cause:** Missing `control_tower_id` matching in upsert logic.
**Fix:** Check sync logs for specific deal ID mismatches. Control Tower deals should have unique `control_tower_id` mapped to BD Portal `deals.control_tower_id`.

### Monitoring

**Check Sync Logs:**
```sql
SELECT sync_type, entity_type, status, COUNT(*) 
FROM control_tower_sync_log 
WHERE synced_at > NOW() - INTERVAL '24 hours'
GROUP BY sync_type, entity_type, status;
```

**Find Failed Syncs:**
```sql
SELECT * FROM control_tower_sync_log
WHERE status = 'failed'
ORDER BY synced_at DESC
LIMIT 50;
```

## Security & Permissions

### RLS Policies
- **Sync Log View**: Admins only (`super_admin`, `admin`)
- **Sync Log Insert**: System/Edge functions (no auth required for logging)
- **Manual Sync Trigger**: Admins only (verified in edge function)

### API Keys
- **Control Tower Credentials**: Stored encrypted in `integrations.config` JSONB
- **Service Role Key**: Used for cron jobs (not exposed to frontend)

## Review Checklist
- ☑ Pull sync cron job scheduled (hourly)
- ☑ Push sync cron job scheduled (hourly, offset by 30 min)
- ☑ `control_tower_sync_log` table created with indexes
- ☑ `deals` table expanded with CT metadata fields
- ☑ `deal_comments` table has sync tracking columns
- ☑ `deal_checklist_items` has `control_tower_synced_at`
- ☑ Admin dashboard accessible at `/adminpanel/integrations/control-tower-sync`
- ☑ Manual sync buttons functional
- ☑ Sync logs displaying with filters
- ☑ RLS policies protecting sensitive data
- ☑ Error handling and logging in edge functions
- ☑ Documentation complete

## Future Enhancements (Phase 2)
- ✅ **Stage Change Sync**: Push deal stage transitions to CT
- ✅ **Owner Reassignment Sync**: Sync deal owner changes
- ✅ **Webhook-based Real-time Sync**: Replace hourly cron with webhooks for instant updates
- ✅ **Conflict Resolution**: Handle concurrent edits in both systems
- ✅ **Sync Analytics**: Dashboard showing sync performance metrics
- ✅ **Selective Sync**: Allow users to choose which deals to sync

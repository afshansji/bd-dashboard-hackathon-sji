# Control Tower Data Sync - Lead & Client Data Integration

## Overview

This document describes how data is synchronized from Control Tower to the BD Portal, including leads, deals, clients, and their associated contact and company details.

## Architecture

### Data Flow

```
Control Tower Database
         │
         ▼
┌─────────────────────────────────────────┐
│     Supabase Edge Functions             │
│  - sync-control-tower-deals             │
│  - sync-control-tower-clients-api       │
│  - sync-control-tower-employees         │
│  - sync-control-tower-pods              │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│       Local Supabase Database           │
│  - deals (with control_tower_id)        │
│  - clients (with contact details)       │
│  - employees                            │
│  - pods                                 │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│         Frontend React Hooks            │
│  - useLocalDealsByStage()               │
│  - useControlTowerLeads()               │
│  - useControlTowerWarmLeads()           │
│  - useControlTowerDealsByStage()        │
└─────────────────────────────────────────┘
```

### Key Components

| Component | Purpose | Location |
|-----------|---------|----------|
| sync-control-tower-deals | Syncs deals with full client data | `supabase/functions/sync-control-tower-deals/index.ts` |
| sync-control-tower-clients-api | Syncs clients directly | `supabase/functions/sync-control-tower-clients-api/index.ts` |
| useControlTowerLeads | Fetches leads with contact details | `src/hooks/useControlTowerData.tsx` |
| useControlTowerWarmLeads | Fetches HubSpot leads with details | `src/hooks/useControlTowerData.tsx` |
| useLocalDealsByStage | Queries local synced deals | `src/hooks/useDeals.tsx` |

---

## Data Sync: Deals and Client Details

### How Deals Are Synced

The `sync-control-tower-deals` edge function performs the following:

1. **Fetches deals with joined client data** from Control Tower:
   ```sql
   SELECT
     Deal.*,
     clients.id,
     clients.name,
     clients.email,
     clients.contact_email,
     clients.phone,
     clients.contact_phone,
     clients.contact_person,
     clients.website,
     clients.domain,
     clients.address,
     clients.city,
     clients.state,
     clients.country,
     clients.postal_code,
     clients.industry,
     clients.company,
     clients.status
   FROM Deal
   LEFT JOIN clients ON Deal.client_id = clients.id
   ```

2. **Extracts client data** from each deal (combining embedded deal fields and joined client data):
   - Company name
   - Contact email
   - Contact phone
   - Contact person name
   - Website/domain
   - Industry
   - Full address (street, city, state, country, postal code)

3. **Upserts clients** to local database with all contact details

4. **Upserts deals** with reference to local client IDs

### Client Data Sources (Priority Order)

When extracting client data, the sync function uses the following priority:

| Field | Priority 1 (Joined Client) | Priority 2 (Deal Fields) |
|-------|---------------------------|-------------------------|
| Email | `client.contact_email` / `client.email` | `deal.clientEmail` / `deal.client_email` |
| Phone | `client.contact_phone` / `client.phone` | `deal.clientPhone` / `deal.client_phone` |
| Contact Person | `client.contact_person` / `client.contact_name` | `deal.clientContactName` / `deal.clientFirstName + clientLastName` |
| Company | `client.company` / `client.name` | `deal.clientCompanyName` / `deal.company_name` |
| Website | `client.website` / `client.domain` | `deal.clientWebsite` / `deal.client_website` |
| Industry | `client.industry` | (not available in deal) |
| Address | `client.address`, `client.city`, etc. | (not available in deal) |

---

## Data Sync: Leads

### Lead Sources in Control Tower

1. **Lead Table** - Core lead data
   - Fetched by: `useControlTowerLeads()`
   - Contains: Basic lead info, may have client relationship

2. **HubSpot_Leads Table** - HubSpot-synced warm leads
   - Fetched by: `useControlTowerWarmLeads()`
   - Contains: HubSpot contact data, enriched fields

### Lead Data with Contact Details

The `useControlTowerLeads` hook now fetches leads with full contact and company associations:

```typescript
const { data, error } = await client
  .from('Lead')
  .select(`
    *,
    client:clients!client_id (
      id, name, company, email, contact_email,
      phone, contact_phone, contact_person,
      website, domain, industry, address,
      city, state, country
    )
  `)
```

### Lead Field Mapping

| Display Field | Lead Fields | Client Fields (if joined) |
|---------------|-------------|--------------------------|
| Contact First Name | `first_name`, `contact_first_name` | - |
| Contact Last Name | `last_name`, `contact_last_name` | - |
| Contact Email | `email`, `contact_email` | `contact_email`, `email` |
| Contact Phone | `phone`, `contact_phone` | `contact_phone`, `phone` |
| Contact Title | `title`, `job_title`, `contact_title` | - |
| Company Name | `company`, `company_name`, `organization` | `company`, `name` |
| Company Website | `website`, `company_website`, `domain` | `website`, `domain` |
| Company Industry | `industry`, `company_industry` | `industry` |
| Company Address | `address`, `company_address` | `address` |
| LinkedIn URL | `linkedin_url`, `linkedin` | - |

### HubSpot Lead Field Mapping

| Display Field | HubSpot Fields | Client Fields (if joined) |
|---------------|----------------|--------------------------|
| Contact First Name | `firstname`, `first_name` | - |
| Contact Last Name | `lastname`, `last_name` | - |
| Contact Email | `email`, `hs_email` | `contact_email`, `email` |
| Contact Phone | `phone`, `hs_phone`, `mobilephone` | `contact_phone`, `phone` |
| Contact Title | `jobtitle`, `job_title`, `title` | - |
| Company Name | `company`, `associatedcompanyid_name` | `company`, `name` |
| Company Website | `website`, `domain` | `website`, `domain` |
| HubSpot Contact ID | `hs_object_id`, `vid` | - |
| Lead Score | `lead_score`, `hs_lead_score`, `hubspotscore` | - |
| Lead Status | `hs_lead_status`, `lifecyclestage` | - |
| LinkedIn URL | `linkedin`, `linkedinbio`, `hs_linkedinbio` | - |

---

## Type Definitions

### ControlTowerLead

```typescript
interface ControlTowerLead {
  id: string;
  name: string;
  company: string;
  email?: string;
  phone?: string;
  source: 'linkedin' | 'referral' | 'bidding' | 'website' | 'other';
  status: 'cold' | 'warm' | 'hot';
  owner_id?: string;
  owner_name?: string;
  created_at: string;
  updated_at: string;
  notes?: string;

  // Extended contact details
  contact_first_name?: string;
  contact_last_name?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_title?: string;
  contact_person?: string;

  // Extended company details
  company_name?: string;
  company_website?: string;
  company_industry?: string;
  company_address?: string;
  company_city?: string;
  company_state?: string;
  company_country?: string;

  // Social links
  linkedin_url?: string;

  // Client reference
  client_id?: string;
  client?: { id, name, company, email, phone, contact_person, website, industry, address };
}
```

### ControlTowerWarmLead

```typescript
interface ControlTowerWarmLead extends ControlTowerLead {
  // HubSpot specific fields
  hubspot_contact_id?: string;
  hubspot_owner_id?: string;
  lead_status?: string;
  lead_score?: number;
}
```

---

## Triggering Data Sync

### Manual Sync (Admin UI)

1. Navigate to **Admin > Control Tower Sync**
2. Click **"Sync Deals"** button
3. Wait for sync to complete
4. Check toast notification for results

### Manual Sync (CLI)

```bash
# Sync all deals
supabase functions invoke sync-control-tower-deals \
  --body '{"mode": "full"}' \
  --headers '{"Authorization": "Bearer <admin-token>"}'

# Sync single deal
supabase functions invoke sync-control-tower-deals \
  --body '{"dealId": "<deal-id>"}' \
  --headers '{"Authorization": "Bearer <admin-token>"}'

# Sync clients only
supabase functions invoke sync-control-tower-clients-api \
  --headers '{"Authorization": "Bearer <admin-token>"}'
```

### Automatic Sync

Deals are automatically re-synced when:
- User opens a deal detail page
- User triggers manual sync from pipeline page
- Scheduled cron job runs (if configured)

---

## Verifying Data Sync

### Check Client Data

```sql
-- View clients with contact details
SELECT
  name,
  company,
  email,
  phone,
  contact_person,
  website,
  industry,
  address,
  city,
  state,
  control_tower_id,
  synced_from_control_tower
FROM clients
WHERE control_tower_id IS NOT NULL
ORDER BY updated_at DESC
LIMIT 20;
```

### Check Sync Logs

```sql
-- Recent sync results
SELECT
  sync_type,
  status,
  payload->>'deals' as deals_synced,
  payload->>'clients' as clients_synced,
  payload->>'duration' as duration_ms,
  created_at
FROM control_tower_sync_log
WHERE sync_type = 'pull'
ORDER BY created_at DESC
LIMIT 10;
```

### Check Missing Client Data

```sql
-- Deals missing client contact info
SELECT
  d.title,
  c.name as client_name,
  c.email,
  c.phone,
  c.contact_person
FROM deals d
LEFT JOIN clients c ON d.client_id = c.id
WHERE d.synced_from_control_tower = true
  AND (c.email IS NULL OR c.phone IS NULL)
ORDER BY d.updated_at DESC
LIMIT 20;
```

---

## Troubleshooting

### Issue: Leads show no contact details

**Cause:** The Lead table in Control Tower may not have direct contact fields populated.

**Solution:**
1. Check if leads have a `client_id` that links to the clients table
2. Verify the clients table in Control Tower has the contact data
3. Re-sync deals to pull updated client data

### Issue: Client data not appearing in pipeline

**Cause:** Client data wasn't synced from Control Tower client table join.

**Solution:**
1. Run a full sync: `{"mode": "full", "forceFullSync": true}`
2. Check sync logs for errors
3. Verify Control Tower clients table has the expected fields

### Issue: Join fails when fetching leads

**Cause:** The Lead table may not have a `client_id` foreign key.

**Solution:**
The hooks have fallback logic - if the join fails, they will:
1. Fetch basic lead data without join
2. Map contact fields from lead record itself
3. Return data with available fields

---

## Configuration

### Environment Variables

```bash
# Control Tower connection (edge secrets)
Controltowerurl=https://xxx.supabase.co
CONTROLTOWERAPIKEY=eyJ...

# Optional: REST API (for future)
CONTROL_TOWER_API_URL=https://xxx.supabase.co/functions/v1
```

### Database Configuration

Configuration is stored in `ai_configurations` table:

```json
{
  "configuration_type": "control_tower",
  "configuration_data": {
    "url": "https://xxx.supabase.co",
    "anon_key": "eyJ...",
    "is_active": true,
    "use_rest_api": false,
    "use_api_for_leads": false
  }
}
```

---

## Files Modified

| File | Changes |
|------|---------|
| `supabase/functions/sync-control-tower-deals/index.ts` | Added client table join, enhanced extractClientData() |
| `src/hooks/useControlTowerData.tsx` | Enhanced useControlTowerLeads(), useControlTowerWarmLeads() with client joins |
| `src/types/controlTower.ts` | Extended ControlTowerLead and ControlTowerWarmLead types |

---

## Related Documentation

- [CONTROL_TOWER_REST_API_README.md](./CONTROL_TOWER_REST_API_README.md) - REST API quick start
- [CONTROL_TOWER_REST_API_INTEGRATION.md](./CONTROL_TOWER_REST_API_INTEGRATION.md) - Full API documentation
- [LEAD_API_MIGRATION_STRATEGY.md](./LEAD_API_MIGRATION_STRATEGY.md) - Lead API migration strategy
- [pipeline-control-tower-mirror.md](./pipeline-control-tower-mirror.md) - Pipeline implementation

---

*Last Updated: 2025-12-09*
*Version: 1.0.0*

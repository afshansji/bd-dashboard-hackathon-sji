# Lead API Migration Strategy

## Executive Summary

This document outlines the migration strategy for Lead synchronization from direct Supabase access to the Control Tower REST API. **IMPORTANT: As of the current API documentation, Lead endpoints are NOT available in the Control Tower REST API.**

## Current State

### What We Have
- ✅ **Clients API**: Fully documented and implemented
  - `GET /api-v1-clients` - List clients with pagination
  - `GET /api-v1-clients/{id}` - Get single client
  - `POST /api-v1-clients` - Create client
  - `PATCH /api-v1-clients/{id}` - Update client
  - `DELETE /api-v1-clients/{id}` - Delete client

- ✅ **Deals API**: Available (not yet implemented in this migration)
- ✅ **Projects API**: Available (not yet implemented in this migration)
- ✅ **Meetings API**: Available (not yet implemented in this migration)

### What We Don't Have
- ❌ **Leads API**: No endpoints documented or available

### Current Lead Data Sources
The BD Portal currently accesses lead data from two sources via direct Supabase queries:

1. **`Lead` table**: Core lead data from Control Tower
   - Used by: `useControlTowerLeads()` hook
   - Query: Direct Supabase `SELECT * FROM Lead`
   - Data includes: Basic lead information, creation date, status

2. **`HubSpot_Leads` table**: Warm leads synced from HubSpot
   - Used by: `useControlTowerWarmLeads()` hook
   - Query: Direct Supabase `SELECT * FROM HubSpot_Leads`
   - Data includes: HubSpot-enriched lead data, contact info, scores

## Migration Strategy Options

### Option A: Request Lead API from Control Tower Team (RECOMMENDED)

**Description:** Contact the Control Tower API team to add official Lead endpoints.

**Required Endpoints:**
```
GET  /api-v1-leads               - List leads with pagination
GET  /api-v1-leads/{id}          - Get single lead by ID
POST /api-v1-leads               - Create new lead
PATCH /api-v1-leads/{id}         - Update lead
DELETE /api-v1-leads/{id}        - Delete lead

GET  /api-v1-leads/hubspot       - List HubSpot-synced leads (warm leads)
GET  /api-v1-leads/hubspot/{id}  - Get single HubSpot lead
```

**Required Scope:**
- `leads` - Read and write access to lead data

**Pros:**
- ✅ Consistent with Client API migration
- ✅ Official API contracts and documentation
- ✅ Rate limiting and security built-in
- ✅ Better long-term maintainability
- ✅ Multi-tenant support

**Cons:**
- ⏳ Requires Control Tower team to implement
- ⏳ Timeline depends on their roadmap
- ⏳ Delays full migration completion

**Action Items:**
1. Submit API request to Control Tower team with required endpoints
2. Provide use cases and expected request volumes
3. Request `leads` scope for existing API keys
4. Set up timeline for implementation

**Implementation (when API is ready):**
1. Add lead methods to `ControlTowerAPIClient` class
2. Create `sync-control-tower-leads-api` edge function (similar to clients)
3. Add `control_tower_lead_id` columns to `leads` table
4. Create `useControlTowerLeadsAPI()` hook
5. Add "Sync Leads API" button to admin dashboard

---

### Option B: Use Deals API with Lead Stage Filter

**Description:** Treat leads as early-stage deals and use the Deals API.

**Implementation:**
```typescript
// Fetch leads as prospecting-stage deals
const response = await fetch(
  `${baseUrl}/api-v1-deals?stage=prospecting&status=active`,
  {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  }
);
```

**Data Mapping:**
- Deal with `stage = 'prospecting'` → Lead
- Deal with `stage = 'qualification'` → Warm Lead (maybe)
- Map deal fields to lead fields

**Pros:**
- ✅ Immediate implementation (API exists)
- ✅ No waiting for Control Tower team
- ✅ Uses official API

**Cons:**
- ⚠️ May lose Lead-specific fields not in Deal schema
- ⚠️ Conceptual mismatch (lead vs deal)
- ⚠️ May not capture HubSpot-specific lead data
- ⚠️ Complex filtering logic required
- ⚠️ May not work for non-deal leads

**Use Cases:**
- Good for leads that eventually become deals
- May work for sales pipeline leads
- NOT suitable for marketing leads or HubSpot imports

---

### Option C: Hybrid Approach (CURRENT IMPLEMENTATION)

**Description:** Continue using direct Supabase access for Leads, use REST API for Clients only. Migrate Leads to REST API once endpoints are available.

**Current Status:**
```typescript
// Clients: REST API ✅
useControlTowerClientsAPI() → Reads from local DB after API sync

// Leads: Direct Supabase (legacy) 🔄
useControlTowerLeads() → Direct query to Control Tower Supabase
useControlTowerWarmLeads() → Direct query to Control Tower Supabase
```

**Feature Flag:**
```json
{
  "use_rest_api": true,           // For clients
  "use_api_for_leads": false      // For leads (until API available)
}
```

**Pros:**
- ✅ Immediate migration for Clients
- ✅ No disruption to Lead workflows
- ✅ Easy to switch when Lead API is ready
- ✅ Partial progress better than no progress

**Cons:**
- ⚠️ Inconsistent approach (API for some, direct for others)
- ⚠️ Still requires direct Supabase credentials
- ⚠️ Technical debt until full migration

**Migration Path:**
1. **Phase 1 (NOW):** Implement Client REST API sync ✅
2. **Phase 2 (WHEN AVAILABLE):** Implement Lead REST API sync
3. **Phase 3 (FUTURE):** Deprecate direct Supabase access entirely

---

## Recommended Approach

**Primary Strategy: Option C → Option A**

### Immediate (Current Release)
- ✅ Implement Clients REST API sync (completed)
- ✅ Continue using direct Supabase for Leads (no change)
- ✅ Add feature flag `use_api_for_leads = false`
- ✅ Document this strategy for future team members

### Short-term (Next 1-3 months)
- 📧 Request Lead API endpoints from Control Tower team
- 📋 Gather requirements for Lead API schema
- 🔍 Review deal data to see if Option B is viable as interim solution

### Long-term (When Lead API available)
- 🔄 Implement Lead REST API sync (follow Client sync pattern)
- 🧪 Test Lead API sync in parallel with direct access
- 🚀 Enable `use_api_for_leads = true` for gradual rollout
- 🗑️ Deprecate direct Supabase access for Leads

---

## Implementation Checklist (When Lead API Available)

### Database Schema
```sql
-- Add to leads table
ALTER TABLE leads
ADD COLUMN control_tower_lead_id TEXT UNIQUE,
ADD COLUMN synced_from_control_tower_api BOOLEAN DEFAULT FALSE,
ADD COLUMN last_api_sync_at TIMESTAMPTZ;

CREATE INDEX idx_leads_ct_api_id ON leads(control_tower_lead_id);
```

### Edge Function
Create `supabase/functions/sync-control-tower-leads-api/index.ts`:
- Fetch from `GET /api-v1-leads` with pagination
- Transform and upsert to local `leads` table
- Handle `GET /api-v1-leads/hubspot` for warm leads
- Log sync to `control_tower_sync_log`

### Frontend Hooks
Add to `src/hooks/useControlTowerData.tsx`:
```typescript
export const useControlTowerLeadsAPI = () => {
  // Query local leads table where synced_from_control_tower_api = true
};

export const useSyncControlTowerLeadsAPI = () => {
  // Trigger sync-control-tower-leads-api edge function
};
```

### Admin UI
Add to `src/pages/admin/ControlTowerSyncDashboard.tsx`:
- "🔥 Sync Leads API" button
- Display sync results (new, updated, failed)
- Show last sync timestamp

---

## Technical Debt and Risks

### Current Technical Debt
1. **Direct Supabase Dependency**
   - Still requires Control Tower Supabase URL and anon key
   - Cannot fully sunset direct access until Leads are migrated
   - Security risk: credentials stored in multiple places

2. **Inconsistent Data Access Patterns**
   - Clients: REST API → Local DB → Frontend
   - Leads: Control Tower DB → Frontend (direct)
   - Confusing for developers

### Migration Risks
1. **API Schema Mismatch**
   - Lead API schema may differ from current `Lead` table
   - May require data transformation
   - Risk of data loss if fields not mapped correctly

2. **HubSpot Integration**
   - HubSpot_Leads table may have unique fields
   - May require separate API endpoint
   - Risk of losing HubSpot-specific enrichment data

3. **Performance**
   - Direct queries are faster (no API overhead)
   - REST API sync is batch-based (may be stale)
   - Need to balance freshness vs performance

### Mitigation Strategies
- ✅ Implement feature flags for gradual rollout
- ✅ Run parallel syncs to validate data parity
- ✅ Keep direct Supabase access as fallback
- ✅ Monitor sync success rates and errors
- ✅ Document all schema mappings clearly

---

## Testing Strategy (When Implementing)

### Unit Tests
- [ ] Test lead API client methods
- [ ] Test data transformation (API → Local DB schema)
- [ ] Test error handling for all API error codes

### Integration Tests
- [ ] Test end-to-end sync flow
- [ ] Test sync with pagination (>100 leads)
- [ ] Test sync with rate limiting
- [ ] Test sync failure recovery

### Parallel Testing
- [ ] Run both direct and API sync for 1 week
- [ ] Compare data consistency (row counts, field values)
- [ ] Measure performance (sync duration, API latency)
- [ ] Validate no data loss

### User Acceptance Testing
- [ ] Verify leads appear correctly in BD Portal
- [ ] Verify HubSpot leads sync correctly
- [ ] Test manual sync button
- [ ] Verify sync status and error messages

---

## Contact Information

**For API Requests:**
- Control Tower Team: [contact info needed]
- API Documentation: [link to Control Tower API docs]

**For Implementation Questions:**
- BD Portal Team: [your team contact]
- This Document Maintainer: [your name/email]

---

## Changelog

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-12-22 | 1.0 | Initial strategy document | BD Portal Team |
| TBD | 2.0 | Updated with Lead API endpoints (when available) | TBD |

---

## Appendix A: Lead API Request Template

**To: Control Tower API Team**

Subject: Request for Lead API Endpoints

---

Hi Control Tower Team,

We're currently migrating the BD Portal from direct Supabase access to your official REST API. We've successfully implemented Client sync using the API, and would like to request Lead endpoints to complete the migration.

**Required Endpoints:**

1. **List Leads**
   - `GET /api-v1-leads?page=1&limit=100`
   - Pagination support (similar to Clients API)
   - Optional filters: status, source, date_range

2. **Get Single Lead**
   - `GET /api-v1-leads/{id}`

3. **Create Lead**
   - `POST /api-v1-leads`

4. **Update Lead**
   - `PATCH /api-v1-leads/{id}`

5. **HubSpot Leads (Warm Leads)**
   - `GET /api-v1-leads/hubspot?page=1&limit=100`

**Required Scope:**
- `leads` - Read and write access to lead data

**Expected Usage:**
- ~500 leads total
- Sync frequency: Every 1 hour
- Expected growth: ~50 new leads/month

**Benefits:**
- Better security (no direct DB credentials)
- Rate limiting and monitoring
- Multi-tenant support
- Consistent with existing Client API

Please let us know the timeline for implementation. We're happy to provide more details or discuss requirements.

Thank you!

---

## Appendix B: Code Stub for Future Implementation

```typescript
// src/integrations/controlTower/restApiClient.ts

/**
 * FUTURE: List all leads (when API available)
 * GET /api-v1-leads
 */
public async listLeads(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}): Promise<APIResponse<ListLeadsResponse>> {
  // TODO: Implement when API is available
  throw new Error(
    'Lead API endpoints are not yet available. ' +
    'See docs/LEAD_API_MIGRATION_STRATEGY.md for details.'
  );
}

/**
 * FUTURE: List HubSpot leads (when API available)
 * GET /api-v1-leads/hubspot
 */
public async listHubSpotLeads(params?: {
  page?: number;
  limit?: number;
}): Promise<APIResponse<ListHubSpotLeadsResponse>> {
  // TODO: Implement when API is available
  throw new Error(
    'HubSpot Lead API endpoints are not yet available. ' +
    'See docs/LEAD_API_MIGRATION_STRATEGY.md for details.'
  );
}
```

This stub is already included in the `ControlTowerAPIClient` class as a placeholder.

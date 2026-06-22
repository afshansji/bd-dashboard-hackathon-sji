# CRM Integrations

The SJ Business Development AI Platform now supports synchronized CRM data flows for **HubSpot** and **GoHighLevel (GHL)**. This document explains how each integration is configured, how the Supabase edge functions behave, and which tables receive updates.

---

## 1. HubSpot CRM

### 1.1 Configuration overview
- **Edge function:** `supabase/functions/hubspot-sync/index.ts`
- **Primary endpoints:**
  - `POST /sync` – performs a full company/contact/deal synchronization.
  - `GET /status` – returns the most recent sync timestamp and activation flag.
  - `POST /webhook` – processes HubSpot webhook notifications and triggers an incremental sync.
- **Integration record:** stored in `integrations` with `type = 'hubspot'` and encrypted credential metadata under `config.api_key_encrypted`.
- **Authentication:** all function calls require the Supabase service role key. Credentials are decrypted via `supabase/functions/_shared/crypto.ts` using the `INTEGRATION_SECRET_KEY`.

### 1.2 Setup steps
1. Store the HubSpot private app access token in the `integrations` table (`config.api_key_encrypted`). Use the `encryptSecret` helper or the provided admin UI toggle.
2. Enable the edge function in Supabase (`supabase functions deploy hubspot-sync`).
3. (Optional) Configure HubSpot webhooks to call `/hubspot-sync/webhook` and include the `HUBSPOT_WEBHOOK_SECRET` header if one is configured.
4. In the admin panel, toggle **HubSpot CRM** on and run **Sync Now** to populate data.

### 1.3 Data mapping
| HubSpot object | Supabase table | Key fields |
| --- | --- | --- |
| Company | `clients` | `hubspot_id`, `name`, `website`, `phone`, `city`, `state`, `country`, `company_revenue`, `team_size`, `hubspot_last_sync` |
| Contact | `contacts` | `hubspot_id`, `client_id`, `first_name`, `last_name`, `email`, `phone`, `job_title`, `hubspot_last_sync` |
| Deal | `deals` | `hubspot_id`, `client_id`, `name`, `amount`, `stage`, `pipeline`, `probability`, `close_date`, `hubspot_updated_at` |
| Metrics | `analytics_data` | `metric_name = 'integration_sync'` (record counts), `metric_name = 'pipeline_value'` (deal amount) |

### 1.4 Example payloads
```json
{
  "company": {
    "id": "123456",
    "properties": {
      "name": "Acme Corporation",
      "domain": "acme.com",
      "phone": "+1-555-0100",
      "city": "Austin",
      "state": "TX",
      "country": "USA",
      "annualrevenue": "1250000",
      "numberofemployees": "48",
      "description": "B2B SaaS platform"
    }
  },
  "contact": {
    "id": "89012",
    "properties": {
      "firstname": "Jamie",
      "lastname": "Rivera",
      "email": "jamie.rivera@acme.com",
      "phone": "+1-555-0101",
      "jobtitle": "VP Sales"
    }
  },
  "deal": {
    "id": "90123",
    "properties": {
      "dealname": "FY25 Expansion",
      "amount": "64000",
      "dealstage": "presentationscheduled",
      "pipeline": "default",
      "hs_pipeline_stage_probability": "0.6",
      "closedate": "2025-06-30"
    }
  }
}
```

---

## 2. GoHighLevel CRM

### 2.1 Configuration overview
- **Edge function:** `supabase/functions/gohighlevel-manage/index.ts`
- **Primary endpoints:**
  - `POST /test-connection` – validates API credentials and location ID without saving them (returns location details if successful).
  - `POST /integration` – encrypts and saves API credentials after validation.
  - `GET /integration` – returns the active integration metadata for the authenticated user.
  - `DELETE /integration/:id` – disables an integration and purges cached contacts.
  - `POST /sync-contacts` – imports contacts, opportunities, and KPI metrics.
  - `POST /push-client` – pushes a single client to GoHighLevel as a contact.
  - `POST /webhook` – validates incoming GoHighLevel webhook payloads (optional `GHL_WEBHOOK_SECRET`) and triggers a sync.
- **Integration record:** stored per-user in `gohighlevel_integrations` with the encrypted API key (`api_key_encrypted`) and required `location_id`.
- **Contacts cache:** `gohighlevel_contacts` contains the last synced contact snapshot per integration.

### 2.2 Setup steps
1. Obtain a GoHighLevel API key (location or agency level) and the `locationId` for your GHL location.
2. In the admin panel's **CRM Integrations** section, enter the API key and location ID.
3. Click **Test Connection** to verify credentials before saving. This validates both the API key and location ID.
4. If the test is successful, click **Add Location** to save. The API key is encrypted with `INTEGRATION_SECRET_KEY` before storage.
5. Use **Sync Contacts** to populate `gohighlevel_contacts`, normalize clients, and update KPIs.
6. (Optional) Configure a GoHighLevel webhook to call `/gohighlevel-manage/webhook` and include the `GHL_WEBHOOK_SECRET` header if configured.

### 2.2.1 Common errors and troubleshooting
- **"Invalid API key or insufficient permissions"**: The API key is incorrect or doesn't have the required scopes. Generate a new API key from GHL Settings → Integrations → API with full permissions.
- **"Location ID not found"**: The location ID is incorrect. Find your location ID in the GHL URL: `.../location/YOUR_LOCATION_ID/...`
- **"Location already connected"**: This location has already been added to your account. Remove the existing connection first if you want to update credentials.
- **Connection timeout**: Check that your Supabase instance can reach `services.leadconnectorhq.com`. Verify network settings and firewall rules.

### 2.3 Data mapping
| GoHighLevel source | Supabase table | Key fields |
| --- | --- | --- |
| Contact | `gohighlevel_contacts` | `integration_id`, `contact_id`, `name`, `email`, `phone`, `status` |
| Contact → Client | `clients` | `name`, `company`, `email`, `phone`, `source = 'gohighlevel'` |
| Opportunity | `deals` | `hubspot_id = 'ghl:{id}'`, `client_id`, `name`, `amount`, `stage`, `pipeline`, `probability`, `deal_type = 'gohighlevel'` |
| Metrics | `analytics_data` | `metric_name = 'integration_sync'`, `metric_value = contacts synced`, `dimensions.pipelineValue` |
| KPIs | `brand_kpis` | `name = 'SQL Opportunities'`, `name = 'Pipeline Value'`, `source = 'gohighlevel'` |

### 2.4 Example payload
```json
{
  "contact": {
    "id": "c-493920",
    "name": "Jordan Lee",
    "email": "jordan.lee@example.com",
    "phone": "+1-555-2043",
    "companyName": "Northwind Traders",
    "tags": ["SQL", "Demo Requested"]
  },
  "opportunity": {
    "id": "o-22901",
    "name": "Northwind Expansion",
    "monetaryValue": 42000,
    "pipelineStage": "Negotiation",
    "probability": 0.4,
    "contactId": "c-493920",
    "pipelineName": "Main Pipeline"
  }
}
```

---

## 3. Unified Integration Dashboard
- **Edge function:** `supabase/functions/integrations-dashboard/index.ts`
- Aggregates HubSpot and GoHighLevel state for the admin UI and exposes:
  - `GET /` – returns an array of integrations with status, type, metadata, and last sync time.
  - `PATCH /` – toggles an integration’s `is_active` flag (HubSpot or GHL).
  - `GET /secret?type=hubspot|gohighlevel` – indicates whether an encrypted credential exists.
- The React admin screen (`src/pages/admin/IntegrationManager.tsx`) consumes this function to display toggles, last sync timestamps, and log viewers.

---

## 4. Logging & Security
- All credential fields are encrypted using AES-GCM (`encryptSecret` / `decryptSecret`). Keep `INTEGRATION_SECRET_KEY` rotated and private.
- Synchronization results are stored in `analytics_data` with `metric_name = 'integration_sync'` and `dimensions.triggeredBy` describing whether the sync was manual or webhook triggered.
- HubSpot deals and GoHighLevel opportunities update `brand_kpis` to surface **SQL Opportunities** and **Pipeline Value** metrics for downstream dashboards.
- Ensure the Supabase service role key is provided to edge functions via environment variables before deploying.

---

By following these steps the business development team can maintain up-to-date CRM data, trigger manual syncs, and inspect audit logs directly inside the platform.

# Database Schema

_Last Updated: 2025-02-18_

The Supabase Postgres database underpins authentication, CRM records, automation pipelines, and analytics. All tables enforce Row Level Security (RLS) with policies defined in `supabase/migrations`. Below is the canonical schema grouped by domain.

---

### Table: users

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | References `auth.users` | No | Primary key mirroring Supabase auth UID. |
| email | Text | — | No | Unique login email. |
| first_name | Text | — | Yes | Optional given name. |
| last_name | Text | — | Yes | Optional surname. |
| status | Text (`active\|inactive\|pending`) | `'active'` | No | Lifecycle state used for admin workflows. |
| title | Text | — | Yes | Job title label. |
| department | Text | — | Yes | Department label used in dashboards. |
| is_marketing | Boolean | `false` | Yes | Flags marketing operations users. |
| created_at | Timestamptz | `now()` | No | Creation timestamp. |
| updated_at | Timestamptz | `now()` | No | Auto-managed via `update_updated_at_column`. |

**Sample Data**
```json
{
  "id": "b3d5a68c-1f2a-4e71-8abf-27e2d5f0c123",
  "email": "alex.morgan@sjinnovation.com",
  "first_name": "Alex",
  "last_name": "Morgan",
  "status": "active",
  "title": "Business Development Manager",
  "department": "Business Development",
  "is_marketing": false,
  "created_at": "2025-02-14T12:10:22.000Z",
  "updated_at": "2025-02-14T12:10:22.000Z"
}
```

---

### Table: user_roles

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key for role assignment row. |
| user_id | UUID | — | No | References `users.id`. |
| role | Enum `app_role` | — | No | Role slug (`super_admin`, `manager`, `pm`, `user`). |
| created_at | Timestamptz | `now()` | No | Audit creation timestamp. |

**Sample Data**
```json
{
  "id": "12ab673c-47d8-4980-90df-cd8b7156c901",
  "user_id": "b3d5a68c-1f2a-4e71-8abf-27e2d5f0c123",
  "role": "super_admin",
  "created_at": "2025-02-14T12:15:45.000Z"
}
```

---

### Table: user_brands

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| user_id | UUID | — | No | Auth user assigned to a brand. |
| brand_id | UUID | — | No | References `brands.id`. |
| access_level | Text (`owner\|member\|viewer`) | `'member'` | Yes | Determines admin rights. |
| can_view_analytics | Boolean | `true` | Yes | Analytics access toggle. |
| can_manage_content | Boolean | `true` | Yes | Content management toggle. |
| can_manage_team | Boolean | `false` | Yes | Team management permission. |
| can_manage_settings | Boolean | `false` | Yes | Settings permission. |
| created_at | Timestamptz | `now()` | Yes | Row creation timestamp. |
| updated_at | Timestamptz | `now()` | Yes | Auto-updated timestamp. |

**Sample Data**
```json
{
  "id": "f2ad0f17-55fc-41ef-93ed-3f4d4be22380",
  "user_id": "b3d5a68c-1f2a-4e71-8abf-27e2d5f0c123",
  "brand_id": "3d8a9bf0-5a4f-4a3a-8b2a-92a1ec4fe912",
  "access_level": "owner",
  "can_view_analytics": true,
  "can_manage_content": true,
  "can_manage_team": true,
  "can_manage_settings": true,
  "created_at": "2025-02-14T12:16:52.000Z",
  "updated_at": "2025-02-14T12:16:52.000Z"
}
```

---

### Table: user_permissions

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| user_id | UUID | — | No | References `users.id`. |
| module_name | Text | — | No | Application module (e.g., `projects`, `integrations`). |
| can_view | Boolean | `false` | Yes | View permission flag. |
| can_create | Boolean | `false` | Yes | Create permission flag. |
| can_edit | Boolean | `false` | Yes | Edit permission flag. |
| can_delete | Boolean | `false` | Yes | Delete permission flag. |
| created_at | Timestamptz | `now()` | Yes | Creation timestamp. |
| updated_at | Timestamptz | `now()` | Yes | Last update timestamp. |

**Sample Data**
```json
{
  "id": "3fd0a91d-9ef2-476d-b9ce-7a6d8d4f80a4",
  "user_id": "b3d5a68c-1f2a-4e71-8abf-27e2d5f0c123",
  "module_name": "integrations",
  "can_view": true,
  "can_create": true,
  "can_edit": true,
  "can_delete": false,
  "created_at": "2025-02-14T12:18:04.000Z",
  "updated_at": "2025-02-14T12:18:04.000Z"
}
```

---

### Table: profiles

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | References `auth.users` | No | Legacy profile key (mirrors auth UID). |
| email | Text | — | No | Email alias mirrored for compatibility. |
| full_name | Text | — | Yes | Display name prior to users table consolidation. |
| avatar_url | Text | — | Yes | Public avatar asset path. |
| created_at | Timestamptz | `now()` | No | Creation timestamp. |
| updated_at | Timestamptz | `now()` | No | Update timestamp. |

**Sample Data**
```json
{
  "id": "b3d5a68c-1f2a-4e71-8abf-27e2d5f0c123",
  "email": "alex.morgan@sjinnovation.com",
  "full_name": "Alex Morgan",
  "avatar_url": "https://storage.googleapis.com/.../avatars/alex.png",
  "created_at": "2024-11-01T09:32:11.000Z",
  "updated_at": "2024-11-01T09:32:11.000Z"
}
```

---

### Table: brands

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| name | Text | — | No | Brand name displayed in UI. |
| description | Text | — | Yes | Brand overview copy. |
| industry | Text | — | Yes | Industry vertical. |
| website | Text | — | Yes | Brand website URL. |
| logo_url | Text | — | Yes | Logo asset path. |
| slug | Text | — | Yes | URL slug used in routing. |
| owner_id | UUID | — | Yes | References primary owner in `users`. |
| active_integrations | Text[] | — | Yes | List of enabled integrations. |
| is_active | Boolean | `true` | Yes | Activation toggle. |
| created_at | Timestamptz | `now()` | No | Creation timestamp. |
| updated_at | Timestamptz | `now()` | No | Update timestamp. |

**Sample Data**
```json
{
  "id": "3d8a9bf0-5a4f-4a3a-8b2a-92a1ec4fe912",
  "name": "NovaTech Labs",
  "description": "Enterprise AI automation partner",
  "industry": "Technology",
  "website": "https://novatechlabs.example",
  "logo_url": "https://cdn.sjinnovation.com/brands/novatech.svg",
  "slug": "novatech-labs",
  "owner_id": "b3d5a68c-1f2a-4e71-8abf-27e2d5f0c123",
  "active_integrations": ["n8n_analytics", "gohighlevel"],
  "is_active": true,
  "created_at": "2025-02-10T08:01:03.000Z",
  "updated_at": "2025-02-12T16:44:55.000Z"
}
```

---

### Table: brand_kpis

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| brand_id | UUID | — | No | References `brands.id`. |
| name | Text | — | No | KPI label. |
| description | Text | — | Yes | Human-friendly KPI explanation. |
| type | Text | — | No | Category such as `growth`, `revenue`, or `retention`. |
| source | Text | — | No | Data source identifier (e.g., `gohighlevel`, `manual`). |
| current_value | Numeric | — | No | Latest KPI value. |
| target_value | Numeric | — | Yes | Goal value. |
| display_order | Integer | — | No | Ordering for dashboards. |
| created_at | Timestamptz | `now()` | No | Created timestamp. |
| updated_at | Timestamptz | `now()` | No | Updated timestamp. |

**Sample Data**
```json
{
  "id": "7281f8ad-a64f-4cb8-9d10-54c54c6759d1",
  "brand_id": "3d8a9bf0-5a4f-4a3a-8b2a-92a1ec4fe912",
  "name": "Monthly SQL Opportunities",
  "description": "Qualified SQLs sourced this month",
  "type": "growth",
  "source": "gohighlevel",
  "current_value": 37,
  "target_value": 45,
  "display_order": 1,
  "created_at": "2025-02-12T09:43:18.000Z",
  "updated_at": "2025-02-13T18:07:52.000Z"
}
```

---

### Table: brand_analytics_integrations

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| brand_id | UUID | — | No | References `brands.id`. |
| integration_type | Text | `'n8n_analytics'` | No | Integration slug. |
| webhook_url | Text | — | No | Endpoint receiving analytics payloads. |
| webhook_secret | Text | — | No | Shared secret for payload signing. |
| n8n_workflow_id | Text | — | Yes | Associated n8n workflow identifier. |
| is_active | Boolean | `true` | Yes | Activation toggle. |
| last_sync_at | Timestamptz | — | Yes | Timestamp of last payload processed. |
| sync_frequency | Text | `'daily'` | Yes | Sync cadence descriptor. |
| data_sources | JSONB | `{"google_analytics": true}` | Yes | Enabled upstream sources. |
| metadata | JSONB | `{}` | Yes | Arbitrary metadata (e.g., view IDs). |
| created_by | UUID | — | Yes | References user who configured integration. |
| created_at | Timestamptz | `now()` | No | Creation timestamp. |
| updated_at | Timestamptz | `now()` | No | Auto-managed timestamp. |

**Sample Data**
```json
{
  "id": "0f2f4496-ff8d-4a2e-823d-74e7a6a82ff3",
  "brand_id": "3d8a9bf0-5a4f-4a3a-8b2a-92a1ec4fe912",
  "integration_type": "n8n_analytics",
  "webhook_url": "https://n8n.internal/hooks/brand-analytics/novatech",
  "webhook_secret": "***",
  "n8n_workflow_id": "wf_2845",
  "is_active": true,
  "last_sync_at": "2025-02-14T05:30:11.000Z",
  "sync_frequency": "daily",
  "data_sources": {"google_analytics": true},
  "metadata": {"view_id": "ga4-12345"},
  "created_by": "b3d5a68c-1f2a-4e71-8abf-27e2d5f0c123",
  "created_at": "2025-02-11T10:04:21.000Z",
  "updated_at": "2025-02-14T05:30:11.000Z"
}
```

---

### Table: brand_analytics_data

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| brand_id | UUID | — | No | References `brands.id`. |
| integration_id | UUID | — | Yes | References `brand_analytics_integrations.id`. |
| data_type | Text | — | No | Metric grouping (e.g., `sessions`, `conversion`). |
| date_range_start | Date | — | No | Start date for aggregated data. |
| date_range_end | Date | — | No | End date for aggregated data. |
| metrics | JSONB | — | No | Numeric metric payload (key/value). |
| dimensions | JSONB | `{}` | Yes | Dimension breakdowns (e.g., source, region). |
| raw_data | JSONB | — | Yes | Original payload for auditing. |
| received_at | Timestamptz | `now()` | Yes | Timestamp when webhook hit the API. |
| created_at | Timestamptz | `now()` | No | Storage timestamp. |

**Sample Data**
```json
{
  "id": "2c8ce55e-3846-49e5-8e79-501ace3a0bf7",
  "brand_id": "3d8a9bf0-5a4f-4a3a-8b2a-92a1ec4fe912",
  "integration_id": "0f2f4496-ff8d-4a2e-823d-74e7a6a82ff3",
  "data_type": "web_traffic",
  "date_range_start": "2025-02-08",
  "date_range_end": "2025-02-14",
  "metrics": {"sessions": 1842, "conversions": 76},
  "dimensions": {"source": "google", "medium": "cpc"},
  "raw_data": {"ga": {"rows": []}},
  "received_at": "2025-02-14T05:30:11.000Z",
  "created_at": "2025-02-14T05:30:11.000Z"
}
```

---

### Table: clients

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| name | Text | — | No | Client organization name. |
| company | Text | — | Yes | Additional company alias. |
| brand_id | UUID | — | Yes | Linked brand for reporting. |
| owner_id | UUID | — | Yes | Primary account owner (user). |
| email | Text | — | Yes | Contact email. |
| phone | Text | — | Yes | Phone contact. |
| status | Text | — | Yes | Pipeline status. |
| address/city/state/postal_code/country | Text | — | Yes | Location info. |
| industry | Text | — | Yes | Industry vertical. |
| employee_count | Numeric | — | Yes | Headcount metadata. |
| revenue | Numeric | — | Yes | Annual revenue figure. |
| hubspot_id | Text | — | Yes | External system mapping. |
| last_contact_date | Timestamptz | — | Yes | Last engagement date. |
| notes | Text | — | Yes | Rich notes for account managers. |
| website | Text | — | Yes | Client website. |
| created_at | Timestamptz | `now()` | No | Creation timestamp. |
| updated_at | Timestamptz | `now()` | No | Update timestamp. |

**Sample Data**
```json
{
  "id": "4c612f24-6576-4d04-8b6d-804e8c3a579e",
  "name": "Atlas FinServe",
  "brand_id": "3d8a9bf0-5a4f-4a3a-8b2a-92a1ec4fe912",
  "owner_id": "b3d5a68c-1f2a-4e71-8abf-27e2d5f0c123",
  "email": "ops@atlasfinserve.example",
  "phone": "+1-555-0142",
  "status": "active",
  "industry": "Finance",
  "employee_count": 240,
  "revenue": 12000000,
  "hubspot_id": "123456789",
  "last_contact_date": "2025-02-13T18:20:00.000Z",
  "notes": "Renewal due Q2; exploring AI upsell",
  "created_at": "2025-02-01T11:22:09.000Z",
  "updated_at": "2025-02-14T05:18:43.000Z"
}
```

---

### Table: contacts

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| client_id | UUID | — | Yes | References `clients.id`. |
| first_name | Text | — | Yes | Contact first name. |
| last_name | Text | — | Yes | Contact last name. |
| company | Text | — | Yes | Company label. |
| email | Text | — | Yes | Email address. |
| phone | Text | — | Yes | Phone number. |
| position | Text | — | Yes | Role/title. |
| created_at | Timestamptz | `now()` | No | Created timestamp. |
| updated_at | Timestamptz | `now()` | No | Updated timestamp. |

**Sample Data**
```json
{
  "id": "f52c9ab3-36e4-47dc-9bb3-0f2b3771f0e9",
  "client_id": "4c612f24-6576-4d04-8b6d-804e8c3a579e",
  "first_name": "Dana",
  "last_name": "Reeves",
  "company": "Atlas FinServe",
  "email": "dana.reeves@atlasfinserve.example",
  "phone": "+1-555-0199",
  "position": "VP Operations",
  "created_at": "2025-02-02T09:14:00.000Z",
  "updated_at": "2025-02-02T09:14:00.000Z"
}
```

---

### Table: deals

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| client_id | UUID | — | Yes | References `clients.id`. |
| title | Text | — | No | Deal name. |
| stage | Text | — | Yes | Pipeline stage. |
| amount | Numeric | — | Yes | Deal value. |
| probability | Numeric | — | Yes | Win probability (0-100). |
| owner_id | UUID | — | Yes | Sales owner. |
| close_date | Date | — | Yes | Target close date. |
| status | Text | — | Yes | Additional status metadata. |
| created_at | Timestamptz | `now()` | No | Created timestamp. |
| updated_at | Timestamptz | `now()` | No | Updated timestamp. |

**Sample Data**
```json
{
  "id": "870ae7a0-3346-4dee-8244-d1cd3c96c9ac",
  "client_id": "4c612f24-6576-4d04-8b6d-804e8c3a579e",
  "title": "Enterprise Retainer Renewal",
  "stage": "Negotiation",
  "amount": 450000,
  "probability": 70,
  "owner_id": "b3d5a68c-1f2a-4e71-8abf-27e2d5f0c123",
  "close_date": "2025-03-31",
  "status": "in_progress",
  "created_at": "2025-01-20T14:30:00.000Z",
  "updated_at": "2025-02-13T21:05:42.000Z"
}
```

---

### Table: projects

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| name | Text | — | No | Project name. |
| description | Text | — | Yes | Project scope summary. |
| brand_id | UUID | — | Yes | Associated brand. |
| client_id | UUID | — | Yes | Associated client. |
| project_manager_id | UUID | — | Yes | Responsible manager. |
| budget | Numeric | — | Yes | Budget allocation. |
| status | Text | — | Yes | Workflow state (`planning`, `in_progress`, etc.). |
| start_date | Date | — | Yes | Kickoff date. |
| end_date | Date | — | Yes | Delivery date. |
| created_at | Timestamptz | `now()` | No | Created timestamp. |
| updated_at | Timestamptz | `now()` | No | Updated timestamp. |

**Sample Data**
```json
{
  "id": "fae17390-11b1-4d42-8bb1-9c0b520ab6d4",
  "name": "Atlas AI Prospecting",
  "description": "Build AI-driven outbound automation",
  "brand_id": "3d8a9bf0-5a4f-4a3a-8b2a-92a1ec4fe912",
  "client_id": "4c612f24-6576-4d04-8b6d-804e8c3a579e",
  "project_manager_id": "b3d5a68c-1f2a-4e71-8abf-27e2d5f0c123",
  "budget": 180000,
  "status": "in_progress",
  "start_date": "2025-01-08",
  "end_date": "2025-04-30",
  "created_at": "2025-01-05T08:45:00.000Z",
  "updated_at": "2025-02-13T17:12:39.000Z"
}
```

---

### Table: project_tasks

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| project_id | UUID | — | Yes | References `projects.id`. |
| title | Text | — | No | Task title. |
| description | Text | — | Yes | Task description. |
| status | Text | — | Yes | Task state. |
| priority | Text | — | Yes | Priority marker. |
| assigned_to | UUID | — | Yes | Assigned user. |
| created_by | UUID | — | Yes | Creator user. |
| due_date | Date | — | Yes | Due date. |
| completed_at | Timestamptz | — | Yes | Completion timestamp. |
| estimated_hours | Numeric | — | Yes | Estimate. |
| actual_hours | Numeric | — | Yes | Logged effort. |
| created_at | Timestamptz | `now()` | No | Creation timestamp. |
| updated_at | Timestamptz | `now()` | No | Update timestamp. |

**Sample Data**
```json
{
  "id": "d340a12e-e0c8-465e-88ac-3a857b6872be",
  "project_id": "fae17390-11b1-4d42-8bb1-9c0b520ab6d4",
  "title": "Configure Supabase Edge sync",
  "description": "Wire n8n analytics webhook to Supabase",
  "status": "in_progress",
  "priority": "high",
  "assigned_to": "9f3d8210-7727-4f2c-8a77-96f1f0a9c5cc",
  "estimated_hours": 6,
  "actual_hours": 3.5,
  "due_date": "2025-02-18",
  "created_at": "2025-02-10T10:02:41.000Z",
  "updated_at": "2025-02-13T12:18:22.000Z"
}
```

---

### Table: tasks

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key for general task board items. |
| project_id | UUID | — | Yes | References `projects.id`. |
| title | Text | — | No | Task name. |
| description | Text | — | Yes | Detailed description. |
| status | Text | — | Yes | Status pipeline. |
| priority | Text | — | Yes | Priority label. |
| assigned_to | UUID | — | Yes | Owner. |
| created_by | UUID | — | Yes | Creator. |
| due_date | Date | — | Yes | Due date. |
| completed_at | Timestamptz | — | Yes | Completed timestamp. |
| created_at | Timestamptz | `now()` | No | Created timestamp. |
| updated_at | Timestamptz | `now()` | No | Updated timestamp. |

**Sample Data**
```json
{
  "id": "fb9fbcf0-4aa0-4c6e-8d13-1b8848617881",
  "project_id": "fae17390-11b1-4d42-8bb1-9c0b520ab6d4",
  "title": "Publish weekly KPI recap",
  "description": "Summarize BD KPIs for leadership",
  "status": "planned",
  "priority": "medium",
  "assigned_to": "b3d5a68c-1f2a-4e71-8abf-27e2d5f0c123",
  "due_date": "2025-02-21",
  "created_at": "2025-02-12T14:11:55.000Z",
  "updated_at": "2025-02-12T14:11:55.000Z"
}
```

---

### Table: analytics_data

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| source | Text | — | No | Data source (e.g., `hubspot`, `manual`). |
| metric_name | Text | — | No | Metric identifier. |
| metric_value | Numeric | — | Yes | Numeric value. |
| dimensions | JSONB | `{}` | Yes | Dimensional attributes. |
| recorded_at | Timestamptz | `now()` | No | Date/time of measurement. |
| created_at | Timestamptz | `now()` | No | Creation timestamp. |

**Sample Data**
```json
{
  "id": "4b4af211-cedc-4f19-8d2f-8f92bc9312fb",
  "source": "hubspot",
  "metric_name": "total_calls",
  "metric_value": 128,
  "dimensions": {"owner": "Alex Morgan"},
  "recorded_at": "2025-02-14T00:00:00.000Z",
  "created_at": "2025-02-14T05:00:00.000Z"
}
```

---

### Table: kpis

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| name | Text | — | No | KPI label. |
| description | Text | — | Yes | KPI definition. |
| unit | Text | — | Yes | Unit (e.g., `%`, `count`). |
| current_value | Numeric | — | Yes | Most recent value. |
| target_value | Numeric | — | Yes | Target value. |
| period_start | Date | — | Yes | Reporting period start. |
| period_end | Date | — | Yes | Reporting period end. |
| brand_id | UUID | — | Yes | Optional brand scope. |
| project_id | UUID | — | Yes | Optional project scope. |
| created_at | Timestamptz | `now()` | No | Created timestamp. |
| updated_at | Timestamptz | `now()` | No | Updated timestamp. |

**Sample Data**
```json
{
  "id": "87951b77-7234-4eed-87f2-5b5ad4a324cb",
  "name": "SQL to Deal Conversion",
  "description": "Percentage of SQLs that become deals",
  "unit": "%",
  "current_value": 32.5,
  "target_value": 35,
  "period_start": "2025-02-01",
  "period_end": "2025-02-14",
  "brand_id": "3d8a9bf0-5a4f-4a3a-8b2a-92a1ec4fe912",
  "created_at": "2025-02-14T04:55:00.000Z",
  "updated_at": "2025-02-14T04:55:00.000Z"
}
```

---

### Table: integrations

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| name | Text | — | No | Integration name. |
| type | Text | — | No | Integration type (e.g., `hubspot`). |
| config | JSONB | `{}` | Yes | Provider-specific configuration. |
| is_active | Boolean | `true` | Yes | Activation toggle. |
| last_sync | Timestamptz | — | Yes | Last sync timestamp. |
| created_at | Timestamptz | `now()` | No | Created timestamp. |
| updated_at | Timestamptz | `now()` | No | Updated timestamp. |

**Sample Data**
```json
{
  "id": "0b48786f-92df-4745-8be5-7f651b50a0a7",
  "name": "HubSpot CRM",
  "type": "hubspot",
  "config": {"api_key": "***", "portal_id": "12345"},
  "is_active": true,
  "last_sync": "2025-02-14T03:40:00.000Z",
  "created_at": "2025-01-12T10:00:00.000Z",
  "updated_at": "2025-02-14T03:40:00.000Z"
}
```

---

### Table: eod_submissions

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| user_id | UUID | — | No | References `users.id`. |
| project_id | UUID | — | Yes | Related project. |
| date | Date | — | No | Submission date. |
| tasks_completed | Text | — | Yes | Markdown-style summary. |
| tomorrow_plan | Text | — | Yes | Plan for next day. |
| challenges | Text | — | Yes | Blocking issues. |
| hours_worked | Numeric | — | Yes | Hours logged. |
| created_at | Timestamptz | `now()` | No | Created timestamp. |
| updated_at | Timestamptz | `now()` | No | Updated timestamp. |

**Sample Data**
```json
{
  "id": "3faac6b2-a6a0-4e4a-9c5b-cbd3c1f10a13",
  "user_id": "9f3d8210-7727-4f2c-8a77-96f1f0a9c5cc",
  "project_id": "fae17390-11b1-4d42-8bb1-9c0b520ab6d4",
  "date": "2025-02-13",
  "tasks_completed": "- Delivered Gemini Veo script\n- Synced ActiveCollab",
  "tomorrow_plan": "Finalize KPI dashboard wiring",
  "challenges": "Awaiting analytics credentials",
  "hours_worked": 8,
  "created_at": "2025-02-13T22:05:00.000Z",
  "updated_at": "2025-02-13T22:05:00.000Z"
}
```

---

### Table: team_eod_submissions

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| user_id | UUID | — | No | References `users.id`. |
| submission_date | Date | — | No | Date of team EOD entry. |
| task_links | Text[] | `{}` | Yes | Array of referenced task URLs. |
| notes | Text | — | Yes | Additional commentary. |
| created_at | Timestamptz | `now()` | No | Created timestamp. |
| updated_at | Timestamptz | `now()` | No | Updated timestamp. |

**Sample Data**
```json
{
  "id": "fd4b3965-1d63-4f86-9b7c-e5c9603a9f00",
  "user_id": "9f3d8210-7727-4f2c-8a77-96f1f0a9c5cc",
  "submission_date": "2025-02-13",
  "task_links": ["https://activecollab.example/tasks/123"],
  "notes": "Coordinated with marketing on webinar launch",
  "created_at": "2025-02-13T22:10:00.000Z",
  "updated_at": "2025-02-13T22:10:00.000Z"
}
```

---

### Table: activecollab_task_data

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| external_task_id | Text | — | No | ActiveCollab task identifier. |
| project_id | UUID | — | Yes | References `projects.id`. |
| task_name | Text | — | No | Task title from ActiveCollab. |
| assignee_id | UUID | — | Yes | References `users.id`. |
| status | Text | — | Yes | Current ActiveCollab status. |
| last_comment | Text | — | Yes | Latest comment summary. |
| last_comment_date | Timestamptz | — | Yes | Timestamp of last comment. |
| hours_logged | Numeric | `0` | Yes | Logged hours snapshot. |
| sync_date | Date | — | No | Date of data sync. |
| raw_data | JSONB | `{}` | Yes | Full payload mirror. |
| created_at | Timestamptz | `now()` | No | Created timestamp. |
| updated_at | Timestamptz | `now()` | No | Updated timestamp. |

**Sample Data**
```json
{
  "id": "bb143f47-8f1c-4a32-a563-bc1a11811673",
  "external_task_id": "AC-4810",
  "project_id": "fae17390-11b1-4d42-8bb1-9c0b520ab6d4",
  "task_name": "Draft webinar outline",
  "assignee_id": "9f3d8210-7727-4f2c-8a77-96f1f0a9c5cc",
  "status": "in_progress",
  "hours_logged": 2.5,
  "sync_date": "2025-02-13",
  "raw_data": {"priority": "High"},
  "created_at": "2025-02-13T21:50:00.000Z",
  "updated_at": "2025-02-13T21:50:00.000Z"
}
```

---

### Table: team_daily_summaries

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| user_id | UUID | — | No | References `users.id`. |
| summary_date | Date | — | No | Date of summary. |
| ai_summary | JSONB | `{}` | No | AI-generated summary payload. |
| tasks_completed | Integer | `0` | Yes | Completed task count. |
| hours_logged | Numeric | `0` | Yes | Hours logged. |
| productivity_score | Numeric | — | Yes | Scoring metric from AI. |
| key_accomplishments | Text[] | `{}` | Yes | Highlighted wins. |
| concerns | Text[] | `{}` | Yes | Issues flagged. |
| eod_submission_id | UUID | — | Yes | References `team_eod_submissions.id`. |
| agent_run_id | UUID | — | Yes | References `ai_agent_runs.id`. |
| created_at | Timestamptz | `now()` | No | Created timestamp. |
| updated_at | Timestamptz | `now()` | No | Updated timestamp. |

**Sample Data**
```json
{
  "id": "964bf7a5-6dc6-4d6c-8c10-8fa3f4421d2a",
  "user_id": "9f3d8210-7727-4f2c-8a77-96f1f0a9c5cc",
  "summary_date": "2025-02-13",
  "ai_summary": {"headline": "Strong outbound momentum"},
  "tasks_completed": 5,
  "hours_logged": 7.5,
  "productivity_score": 8.7,
  "key_accomplishments": ["Completed webinar outline", "Synced analytics"],
  "concerns": ["Awaiting marketing approvals"],
  "created_at": "2025-02-13T22:20:00.000Z",
  "updated_at": "2025-02-13T22:20:00.000Z"
}
```

---

### Table: ai_agents

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| name | Text | — | No | Agent name. |
| description | Text | — | Yes | Purpose summary. |
| type | Text | — | No | Agent type (e.g., `analysis`, `generation`). |
| config | JSONB | `{}` | Yes | Agent runtime configuration. |
| created_by | UUID | — | Yes | User who registered agent. |
| is_active | Boolean | `true` | Yes | Toggle for activation. |
| created_at | Timestamptz | `now()` | No | Created timestamp. |
| updated_at | Timestamptz | `now()` | No | Updated timestamp. |

**Sample Data**
```json
{
  "id": "c6a4fdde-71f5-4d68-8c9c-00db0ad0f787",
  "name": "Code Quality Reviewer",
  "description": "Evaluates repositories for maintainability",
  "type": "analysis",
  "config": {"model": "gpt-4o"},
  "created_by": "b3d5a68c-1f2a-4e71-8abf-27e2d5f0c123",
  "is_active": true,
  "created_at": "2025-01-30T11:42:00.000Z",
  "updated_at": "2025-02-10T07:55:14.000Z"
}
```

---

### Table: ai_agent_runs

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| agent_id | UUID | — | Yes | References `ai_agents.id`. |
| title | Text | — | Yes | Run title/subject. |
| category | Text | — | Yes | Run category. |
| status | Text | — | Yes | Execution status. |
| started_at | Timestamptz | `now()` | No | Start timestamp. |
| completed_at | Timestamptz | — | Yes | Completion timestamp. |
| input | JSONB | `{}` | Yes | Input payload. |
| output | JSONB | `{}` | Yes | Output payload. |
| ai_summary | JSONB | `{}` | Yes | AI summary structure. |
| generated_tasks | JSONB | `{}` | Yes | Tasks generated by agent. |
| error | Text | — | Yes | Error message if failed. |
| created_at | Timestamptz | `now()` | No | Created timestamp. |

**Sample Data**
```json
{
  "id": "1ce87f63-83a5-46c0-a0de-35fb7b3c10f5",
  "agent_id": "c6a4fdde-71f5-4d68-8c9c-00db0ad0f787",
  "title": "Atlas code health audit",
  "category": "analysis",
  "status": "completed",
  "started_at": "2025-02-12T14:00:00.000Z",
  "completed_at": "2025-02-12T14:05:33.000Z",
  "input": {"repository_id": "db2b5eb0-f5f7-42b7-8e5e-b07fe3a884ff"},
  "output": {"summary": "Code quality rated A-"},
  "ai_summary": {"headline": "Clean architecture"},
  "generated_tasks": [{"title": "Add missing unit tests"}],
  "created_at": "2025-02-12T14:00:00.000Z"
}
```

---

### Table: ai_configurations

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| user_id | UUID | — | No | Owner of configuration. |
| configuration_type | Text | — | No | Config category (`code_analysis_prompts`, etc.). |
| configuration_data | JSONB | `{}` | No | Structured configuration payload. |
| created_at | Timestamptz | `now()` | No | Created timestamp. |
| updated_at | Timestamptz | `now()` | No | Updated timestamp. |

**Sample Data**
```json
{
  "id": "4d27af13-fc42-4f43-99ce-c5b90a1dd21d",
  "user_id": "b3d5a68c-1f2a-4e71-8abf-27e2d5f0c123",
  "configuration_type": "code_analysis_prompts",
  "configuration_data": {"architecture_analysis": "Analyze service boundaries"},
  "created_at": "2025-01-30T12:00:00.000Z",
  "updated_at": "2025-02-10T09:05:00.000Z"
}
```

---

### Table: collabai_integrations

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| user_id | UUID | — | No | References `users.id`. |
| api_key_encrypted | Text | — | No | Encrypted API credential. |
| base_url | Text | — | No | CollabAI base URL. |
| is_active | Boolean | `true` | Yes | Activation toggle. |
| agent_count | Integer | — | Yes | Populated in later migrations. |
| last_synced_at | Timestamptz | — | Yes | Sync timestamp. |
| created_at | Timestamptz | `now()` | No | Creation timestamp. |
| updated_at | Timestamptz | `now()` | No | Update timestamp. |

**Sample Data**
```json
{
  "id": "70a70a33-2d2f-42e0-b5bd-2e3cb2bc90e5",
  "user_id": "b3d5a68c-1f2a-4e71-8abf-27e2d5f0c123",
  "api_key_encrypted": "base64:***",
  "base_url": "https://collab.ai/api",
  "is_active": true,
  "last_synced_at": "2025-02-13T18:00:00.000Z",
  "created_at": "2025-01-18T10:02:00.000Z",
  "updated_at": "2025-02-13T18:00:00.000Z"
}
```

---

### Table: collabai_chats

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| integration_id | UUID | — | No | References `collabai_integrations.id`. |
| agent_id | Text | — | No | CollabAI agent identifier. |
| user_prompt | Text | — | No | Prompt submitted to agent. |
| ai_response | Text | — | Yes | Response content. |
| status | Text | `'completed'` | Yes | Chat state. |
| created_at | Timestamptz | `now()` | No | Timestamp of exchange. |

**Sample Data**
```json
{
  "id": "d15a67ec-39f9-4d1c-8bb8-14a0a40e51de",
  "integration_id": "70a70a33-2d2f-42e0-b5bd-2e3cb2bc90e5",
  "agent_id": "support-bot",
  "user_prompt": "Summarize today's EOD submissions",
  "ai_response": "3 submissions processed. Key win: Atlas renewal call set.",
  "status": "completed",
  "created_at": "2025-02-13T21:05:00.000Z"
}
```

---

### Table: gohighlevel_integrations

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| user_id | UUID | — | No | References `users.id`. |
| api_key_encrypted | Text | — | No | Encrypted GHL API key. |
| location_id | Text | — | Yes | GoHighLevel location identifier. |
| is_active | Boolean | `true` | Yes | Activation toggle. |
| created_at | Timestamptz | `now()` | No | Created timestamp. |
| updated_at | Timestamptz | `now()` | No | Updated timestamp. |

**Sample Data**
```json
{
  "id": "cfc3ac55-2f1a-4d1e-8898-6c8693a50e22",
  "user_id": "b3d5a68c-1f2a-4e71-8abf-27e2d5f0c123",
  "api_key_encrypted": "base64:***",
  "location_id": "location_01",
  "is_active": true,
  "created_at": "2025-01-10T12:00:00.000Z",
  "updated_at": "2025-02-11T08:30:00.000Z"
}
```

---

### Table: gohighlevel_contacts

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| integration_id | UUID | — | No | References `gohighlevel_integrations.id`. |
| contact_id | Text | — | No | External contact identifier. |
| name | Text | — | Yes | Contact name. |
| email | Text | — | Yes | Contact email. |
| phone | Text | — | Yes | Contact phone. |
| status | Text | — | Yes | Pipeline stage/status. |
| created_at | Timestamptz | `now()` | No | Created timestamp. |

**Sample Data**
```json
{
  "id": "95d60f84-e642-468c-8aa2-1ac04321c1cd",
  "integration_id": "cfc3ac55-2f1a-4d1e-8898-6c8693a50e22",
  "contact_id": "ghl_98765",
  "name": "Jordan Lee",
  "email": "jordan.lee@example.com",
  "phone": "+1-555-2211",
  "status": "follow_up",
  "created_at": "2025-02-12T14:00:00.000Z"
}
```

---

### Table: code_repositories

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| name | Text | — | No | Repository name. |
| description | Text | — | Yes | Repo description. |
| repository_url | Text | — | Yes | Git URL. |
| branch | Text | `'main'` | Yes | Default branch tracked. |
| language | Text | — | Yes | Primary language. |
| framework | Text | — | Yes | Framework tag. |
| last_analyzed_at | Timestamptz | — | Yes | Last analysis timestamp. |
| analysis_status | Text (`pending\|analyzing\|completed\|error`) | `'pending'` | No | Current analysis state. |
| metadata | JSONB | `{}` | Yes | Arbitrary metadata. |
| created_by | UUID | — | Yes | Creator user. |
| created_at | Timestamptz | `now()` | No | Created timestamp. |
| updated_at | Timestamptz | `now()` | No | Updated timestamp. |

**Sample Data**
```json
{
  "id": "db2b5eb0-f5f7-42b7-8e5e-b07fe3a884ff",
  "name": "SJ BD Dashboard",
  "description": "Main frontend codebase",
  "repository_url": "https://github.com/sjinnovation/sj-bd-dashboard",
  "branch": "main",
  "language": "TypeScript",
  "framework": "React",
  "analysis_status": "completed",
  "last_analyzed_at": "2025-02-12T14:05:33.000Z",
  "metadata": {"packages": 42},
  "created_at": "2024-12-15T11:20:00.000Z",
  "updated_at": "2025-02-12T14:05:33.000Z"
}
```

---

### Table: code_analysis_results

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| repository_id | UUID | — | No | References `code_repositories.id`. |
| analysis_type | Text (`architecture\|quality\|security\|performance\|documentation`) | — | No | Type of review. |
| file_path | Text | — | Yes | File path in repository. |
| findings | JSONB | `{}` | No | Structured findings payload. |
| severity | Text (`info\|warning\|error\|critical`) | — | Yes | Severity rating. |
| status | Text (`active\|resolved\|ignored`) | `'active'` | No | Workflow status. |
| agent_run_id | UUID | — | Yes | References `ai_agent_runs.id`. |
| created_at | Timestamptz | `now()` | No | Created timestamp. |
| updated_at | Timestamptz | `now()` | No | Updated timestamp. |

**Sample Data**
```json
{
  "id": "65923e3d-9e3a-4dfc-8610-9aacd2210c3e",
  "repository_id": "db2b5eb0-f5f7-42b7-8e5e-b07fe3a884ff",
  "analysis_type": "quality",
  "file_path": "src/pages/admin/Documentation.tsx",
  "findings": {"issues": ["Missing markdown renderer"]},
  "severity": "warning",
  "status": "active",
  "created_at": "2025-02-12T14:05:33.000Z",
  "updated_at": "2025-02-12T14:05:33.000Z"
}
```

---

### Table: code_generation_templates

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| name | Text | — | No | Template name. |
| description | Text | — | Yes | Template summary. |
| category | Text (`component\|hook\|api\|test\|utility\|page`) | — | No | Template category. |
| template_content | Text | — | No | Source content with tokens. |
| variables | JSONB | `{}` | Yes | Placeholder definitions. |
| framework | Text | — | Yes | Target framework. |
| language | Text | `'typescript'` | Yes | Language label. |
| is_active | Boolean | `true` | Yes | Activation toggle. |
| usage_count | Integer | `0` | Yes | Usage counter. |
| created_by | UUID | — | Yes | Creator user. |
| created_at | Timestamptz | `now()` | No | Created timestamp. |
| updated_at | Timestamptz | `now()` | No | Updated timestamp. |

**Sample Data**
```json
{
  "id": "9aeb45bc-59f8-41d6-8f5a-a02c5461f8d7",
  "name": "React Card Component",
  "description": "Generates a shadcn-styled card",
  "category": "component",
  "template_content": "<Card>...</Card>",
  "variables": {"title": "string", "body": "markdown"},
  "framework": "React",
  "language": "typescript",
  "is_active": true,
  "usage_count": 12,
  "created_at": "2025-01-25T13:00:00.000Z",
  "updated_at": "2025-02-10T07:55:14.000Z"
}
```

---

### Table: documentation utilities (accountability_chart & user_accountability_chart)

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| user_id | UUID | — | No | References `users.id`. |
| position/type_of_work | Text | — | No | Role or work type string. |
| responsibilities | JSONB/Text | `{}` | Yes | Structured responsibility mapping. |
| reports_to | UUID | — | Yes | Reporting line (for `accountability_chart`). |
| serial_number | Integer | — | No | Display order (for `user_accountability_chart`). |
| created_at | Timestamptz | `now()` | No | Created timestamp. |
| updated_at | Timestamptz | `now()` | No | Updated timestamp. |

**Sample Data**
```json
{
  "id": "7f512a4b-89b0-4894-8105-0c5df7aa0123",
  "user_id": "b3d5a68c-1f2a-4e71-8abf-27e2d5f0c123",
  "position": "BD Director",
  "responsibilities": ["Pipeline strategy", "Leadership coaching"],
  "reports_to": null,
  "created_at": "2025-01-03T09:00:00.000Z",
  "updated_at": "2025-02-11T10:45:00.000Z"
}
```

---

### Table: videos & gemini_videos

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| title | Text | — | No | Video title. |
| prompt | Text | — | No | Prompt used for generation. |
| duration | Numeric | — | Yes | Video duration in seconds. |
| status | Text | — | Yes | Generation status. |
| video_url | Text | — | Yes | Storage location. |
| thumbnail_url | Text | — | Yes | Thumbnail asset. |
| created_by | UUID | — | Yes | User initiating render. |
| created_at | Timestamptz | `now()` | No | Created timestamp. |
| updated_at | Timestamptz | `now()` | No | Updated timestamp. |

**Sample Data**
```json
{
  "id": "b10c8f3b-4b9d-4370-9413-ffb6394a912a",
  "title": "Atlas Webinar Trailer",
  "prompt": "Cinematic montage of Atlas BD team successes",
  "duration": 42,
  "status": "rendered",
  "video_url": "https://storage.googleapis.com/.../atlas-trailer.mp4",
  "thumbnail_url": "https://storage.googleapis.com/.../atlas-trailer.jpg",
  "created_by": "9f3d8210-7727-4f2c-8a77-96f1f0a9c5cc",
  "created_at": "2025-02-10T15:30:00.000Z",
  "updated_at": "2025-02-10T15:34:45.000Z"
}
```

---

---

## Business Development Tables

### Table: pods

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| name | Text | — | No | POD team identifier. |
| description | Text | — | Yes | Strategic focus description. |
| lead_user_id | UUID | — | Yes | References POD lead from `users.id`. |
| is_active | Boolean | `true` | Yes | Activation toggle for active PODs. |
| created_at | Timestamptz | `now()` | No | Creation timestamp. |
| updated_at | Timestamptz | `now()` | No | Auto-updated timestamp. |

**Sample Data**
```json
{
  "id": "11111111-1111-1111-1111-111111111111",
  "name": "Enterprise Solutions",
  "description": "Focused on large enterprise clients in tech and finance sectors",
  "lead_user_id": "06e7b3ed-e627-41e6-b267-4b5abfbead8d",
  "is_active": true,
  "created_at": "2025-02-15T10:00:00.000Z",
  "updated_at": "2025-02-15T10:00:00.000Z"
}
```

**RLS Policies:**
- All authenticated users can **SELECT** (view all PODs)
- Only admins and super_admins can **INSERT/UPDATE/DELETE**

---

### Table: target_niches

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| pod_id | UUID | — | Yes | References `pods.id` for team assignment. |
| name | Text | — | No | Niche identifier. |
| description | Text | — | Yes | Market segment overview. |
| services | Text[] | `{}` | Yes | Array of service offerings (e.g., "Custom Software Development"). |
| industries | Text[] | `{}` | Yes | Target industry verticals (e.g., "Fintech", "Healthcare"). |
| target_contacts | Text[] | `{}` | Yes | Decision-maker roles (e.g., "CTO", "VP of Engineering"). |
| target_regions | Text[] | `{}` | Yes | Geographic focus areas (e.g., "North America", "Europe"). |
| employee_size_min | Integer | — | Yes | Minimum company headcount. |
| employee_size_max | Integer | — | Yes | Maximum company headcount. |
| revenue_min | Numeric | — | Yes | Minimum annual revenue filter. |
| revenue_max | Numeric | — | Yes | Maximum annual revenue filter. |
| business_type | Text | — | Yes | B2B/B2C classification. |
| pain_points | Text[] | `{}` | Yes | Array of customer challenges. |
| dreams | Text[] | `{}` | Yes | Array of customer aspirations. |
| status | Text | `'active'` | No | Lifecycle state (`active`, `researching`, `paused`). |
| priority | Text | `'medium'` | No | Prioritization level (`high`, `medium`, `low`). |
| target_revenue | Numeric | — | Yes | Revenue goal for this niche. |
| target_clients | Integer | — | Yes | Client acquisition goal. |
| created_by | UUID | — | Yes | References creator from `users.id`. |
| created_at | Timestamptz | `now()` | No | Creation timestamp. |
| updated_at | Timestamptz | `now()` | No | Auto-updated timestamp. |

**Sample Data**
```json
{
  "id": "a1111111-1111-1111-1111-111111111111",
  "pod_id": "11111111-1111-1111-1111-111111111111",
  "name": "Financial Services Tech Companies",
  "description": "Mid to large-size fintech companies needing enterprise software solutions",
  "services": ["Custom Software Development", "Cloud Migration", "AI/ML Integration"],
  "industries": ["Financial Services", "Fintech", "Banking"],
  "target_contacts": ["CTO", "VP of Engineering", "Head of Digital Transformation"],
  "target_regions": ["North America", "Europe"],
  "employee_size_min": 200,
  "employee_size_max": 5000,
  "revenue_min": 50000000,
  "revenue_max": 500000000,
  "business_type": "B2B SaaS",
  "pain_points": [
    "Legacy system modernization",
    "Regulatory compliance challenges",
    "Scaling technical infrastructure"
  ],
  "dreams": [
    "Digital transformation leadership",
    "Market innovation",
    "Operational efficiency"
  ],
  "status": "active",
  "priority": "high",
  "target_revenue": 2500000,
  "target_clients": 5,
  "created_by": "06e7b3ed-e627-41e6-b267-4b5abfbead8d",
  "created_at": "2025-02-15T11:00:00.000Z",
  "updated_at": "2025-02-15T11:00:00.000Z"
}
```

**RLS Policies:**
- All authenticated users can **SELECT** (view all niches)
- Authenticated users can **INSERT** their own niches (where `created_by = auth.uid()`)
- Creators and admins can **UPDATE/DELETE** niches

---

### Table: campaigns

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| pod_id | UUID | — | No | References `pods.id`. |
| niche_id | UUID | — | No | References `target_niches.id` with cascade delete. |
| name | Text | — | No | Campaign identifier shown in the strategy board. |
| objective | Text | — | Yes | Strategic objective summary. |
| channel_mix | Text[] | `{}` | Yes | Ordered list of channels (`linkedin`, `email`, `events`, etc.). |
| status | campaign_status enum | `'planning'` | No | Board column (`planning`, `scheduled`, `active`, `cooldown`, `completed`, `archived`). |
| launch_date | Date | — | Yes | Planned go-live date. |
| end_date | Date | — | Yes | Planned wrap date. |
| target_accounts | Integer | `0` | Yes | Accounts to engage in the cycle. |
| owner_user_id | UUID | — | Yes | References primary owner in `users`. |
| qa_reviewer_id | UUID | — | Yes | References QA reviewer in `users`. |
| ai_brief_id | UUID | — | Yes | References `campaign_ai_briefs.id`. |
| budget_usd | Numeric | — | Yes | Optional paid spend placeholder. |
| created_by | UUID | — | No | References creator in `users`. |
| created_at | Timestamptz | `now()` | No | Creation timestamp. |
| updated_at | Timestamptz | `now()` | No | Auto-managed trigger. |

**Sample Data**
```json
{
  "id": "cf7d5b1d-90db-4d73-86bb-3b6e2c3064a9",
  "pod_id": "06e7b3ed-e627-41e6-b267-4b5abfbead8d",
  "niche_id": "a1111111-1111-1111-1111-111111111111",
  "name": "Fintech Expansion Q2",
  "objective": "Land 3 enterprise discovery calls in fintech infrastructure",
  "channel_mix": ["linkedin", "email", "events"],
  "status": "scheduled",
  "launch_date": "2025-04-01",
  "end_date": "2025-06-30",
  "target_accounts": 120,
  "owner_user_id": "06e7b3ed-e627-41e6-b267-4b5abfbead8d",
  "qa_reviewer_id": "b3d5a68c-1f2a-4e71-8abf-27e2d5f0c123",
  "ai_brief_id": "41c7c4f0-52d1-4ad4-a02b-6990a8a0dc3f",
  "budget_usd": 2500,
  "created_by": "06e7b3ed-e627-41e6-b267-4b5abfbead8d",
  "created_at": "2025-03-01T08:00:00.000Z",
  "updated_at": "2025-03-01T08:00:00.000Z"
}
```

**RLS Policies:**
- Owners, creators, and admins can **SELECT/UPDATE** rows tied to their POD.
- Only admins and POD leads can **INSERT** new campaigns (validated via edge function guardrails).
- `qa_reviewer_id` must match the QA reviewer role list to set status `scheduled` or `active`.
- Deletions restricted to admins; archiving is preferred (status `archived`).

#### Supporting Tables
- **campaign_briefs** — Text brief + attachments per campaign (`campaign_id`, `brief`, `guardrails`, `updated_by`).
- **campaign_ai_briefs** — AI prompt/response storage with version history (`campaign_id`, `prompt`, `response`, `model`, `created_by`).
- **campaign_milestones** — Timeline checkpoints with `due_at`, `completed_at`, `owner_user_id`.
- **campaign_channels** — Per-channel settings (`campaign_id`, `channel`, `cadence_json`, `integration_payload`, `status`).
- **campaign_metrics_daily** — Daily aggregates for analytics dashboards (`campaign_id`, `date`, `contacts`, `responses`, `meetings`, `deals`, `influenced_pipeline_usd`).
- **campaign_review_logs** — QA approvals (`campaign_id`, `reviewer_id`, `status`, `notes`, `reviewed_at`).

---

### Table: bd_campaigns (Legacy)

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| name | Text | — | No | Campaign identifier. |
| niche_id | UUID | — | No | References `target_niches.id`. |
| brand_id | UUID | — | Yes | References `brands.id` if brand-specific. |
| campaign_type | Text | — | No | Channel type (`linkedin_outbound`, `email_outbound`, `abm`, `cold_calling`, `other`). |
| status | Text | `'planning'` | No | Execution state (`planning`, `active`, `paused`, `completed`). |
| start_date | Date | — | Yes | Campaign start date. |
| end_date | Date | — | Yes | Campaign end date. |
| target_contacts | Text[] | `{}` | Yes | Subset of niche contact roles. |
| target_regions | Text[] | `{}` | Yes | Subset of niche regions. |
| target_contacts_count | Integer | `0` | Yes | Total contacts to reach. |
| actual_contacts_reached | Integer | `0` | Yes | Contacts actually engaged. |
| responses_received | Integer | `0` | Yes | Replies/engagement count. |
| meetings_booked | Integer | `0` | Yes | Scheduled conversations. |
| deals_generated | Integer | `0` | Yes | Opportunities created. |
| owned_by | UUID | — | Yes | References campaign owner from `users.id`. |
| created_by | UUID | — | Yes | References campaign creator from `users.id`. |
| created_at | Timestamptz | `now()` | No | Creation timestamp. |
| updated_at | Timestamptz | `now()` | No | Auto-updated timestamp. |

**Sample Data**
```json
{
  "id": "ca111111-1111-1111-1111-111111111111",
  "name": "Fintech CTO Outreach Q1 2025",
  "niche_id": "a1111111-1111-1111-1111-111111111111",
  "brand_id": null,
  "campaign_type": "linkedin_outbound",
  "status": "active",
  "start_date": "2025-01-01",
  "end_date": "2025-03-31",
  "target_contacts": ["CTO", "VP of Engineering"],
  "target_regions": ["North America"],
  "target_contacts_count": 150,
  "actual_contacts_reached": 89,
  "responses_received": 23,
  "meetings_booked": 8,
  "deals_generated": 2,
  "owned_by": "06e7b3ed-e627-41e6-b267-4b5abfbead8d",
  "created_by": "06e7b3ed-e627-41e6-b267-4b5abfbead8d",
  "created_at": "2025-01-05T09:00:00.000Z",
  "updated_at": "2025-02-15T14:30:00.000Z"
}
```

**RLS Policies:**
- Table is read-only. All authenticated users can **SELECT** for historical reporting.
- No **INSERT/UPDATE/DELETE** operations after the 2025-03 migration; enforced by triggers.

**Migration Note:** Records migrated to `campaigns` include a `legacy_bd_campaign_id` column for traceability. The legacy view remains until Q3 2025 dashboards are updated.

---

### Table: documentation helpers (integrations & automation)

Other supporting tables include:
- **collabai_agents:** metadata about imported CollabAI agents (name, description, metadata, linked integration).
- **analytics_data:** generalized metric capture for dashboards.
- **team_summaries:** high-level aggregated EOD summaries for leadership views.

Each follows the same timestamp + `gen_random_uuid()` conventions shown above and is enforced with RLS policies defined in the migrations.

### Table: ai_shared_resources

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| agent_id | UUID | — | No | References `ai_agents.id`. |
| resource_type | Text | — | No | Resource category such as `vector_store`. |
| resource_identifier | Text | — | No | External identifier for the resource. |
| metadata | JSONB | `{}` | Yes | Additional metadata (synced timestamps, provider, description). |
| created_at | Timestamptz | `now()` | No | Creation timestamp. |
| updated_at | Timestamptz | `now()` | No | Managed via trigger. |

**Sample Data**
```json
{
  "id": "8f7f0bdc-2e6c-40ea-9ff9-1ffce8e4bb7f",
  "agent_id": "4fda706e-9376-41e2-b7fd-3dc901c15b7a",
  "resource_type": "vector_store",
  "resource_identifier": "vs_company_insights",
  "metadata": { "syncedAt": "2025-02-18T06:20:00.000Z", "description": "Company news embeddings" },
  "created_at": "2025-02-18T06:20:00.000Z",
  "updated_at": "2025-02-18T06:20:00.000Z"
}
```

### Table: feedback_reports

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| type | Text | — | No | `bug` or `feature`. |
| subject | Text | — | No | Summary line provided by reporter. |
| description | Text | — | Yes | Detailed notes. |
| status | Text | `'open'` | No | Workflow state (`open`, `in_review`, `resolved`, `closed`). |
| email | Text | — | Yes | Reporter email used for follow-up. |
| attachment_url | Text | — | Yes | Storage path for optional attachment. |
| created_by | UUID | — | No | References `profiles.id`. |
| reviewed_by | UUID | — | Yes | References `profiles.id`. |
| created_at | Timestamptz | `now()` | No | Creation timestamp. |
| updated_at | Timestamptz | `now()` | No | Managed via trigger. |
| deleted_at | Timestamptz | — | Yes | Soft-delete marker. |

**Sample Data**
```json
{
  "id": "ab438c2c-6315-4592-8c42-7f6f0a21bd71",
  "type": "bug",
  "subject": "Gemini render stalls at 80%",
  "description": "Job render_8912 never completes when attachments exceed 150MB.",
  "status": "in_review",
  "email": "bd-team@sjinno.com",
  "attachment_url": "https://supabase.storage/feedback/gemini-log.txt",
  "created_by": "1c50a8fa-d7f5-4dbf-bc8f-7d3e2c6f2a01",
  "reviewed_by": "b3d5a68c-1f2a-4e71-8abf-27e2d5f0c123",
  "created_at": "2025-02-16T11:40:00.000Z",
  "updated_at": "2025-02-17T08:05:00.000Z",
  "deleted_at": null
}
```

### Table: feedback_comments

| Field | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| id | UUID | `gen_random_uuid()` | No | Primary key. |
| feedback_id | UUID | — | No | References `feedback_reports.id`. |
| user_id | UUID | — | No | References `profiles.id`. |
| comment | Text | — | No | Comment body. |
| created_at | Timestamptz | `now()` | No | Creation timestamp. |

**Sample Data**
```json
{
  "id": "7bc2431a-8474-4bb3-9c89-ff6a799a30fb",
  "feedback_id": "ab438c2c-6315-4592-8c42-7f6f0a21bd71",
  "user_id": "b3d5a68c-1f2a-4e71-8abf-27e2d5f0c123",
  "comment": "Queued fix for deployment tonight.",
  "created_at": "2025-02-17T12:05:00.000Z"
}
```

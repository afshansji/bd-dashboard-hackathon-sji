# Business Development Module

## Overview
The Business Development (BD) module provides an end-to-end workflow management system for outbound business development operations at SJ Innovation. It structures BD activities into three hierarchical layers: **PODs** (teams), **Target Niches** (market segments), and **BD Campaigns** (execution tracking).

## Architecture

### Data Flow
```
PODs → Target Niches → BD Campaigns → Metrics
```

- **PODs** organize team ownership and strategic focus areas
- **Target Niches** define ideal customer profiles with detailed targeting criteria
- **BD Campaigns** track outbound execution with conversion metrics
- **Metrics** flow up from campaigns to inform niche refinement and POD performance

### Database Tables

#### `pods`
Team organization units with ownership and activation status.

**Key Fields:**
- `name` - POD identifier (e.g., "Enterprise Solutions")
- `description` - Strategic focus description
- `lead_user_id` - References POD leader
- `is_active` - Activation toggle

#### `target_niches`
Market segment definitions with ICP (Ideal Customer Profile) criteria.

**Key Fields:**
- `pod_id` - Parent POD assignment
- `name` - Niche identifier
- `description` - Segment overview
- `services` - Array of service offerings
- `industries` - Target industry verticals
- `target_contacts` - Decision-maker roles
- `target_regions` - Geographic focus areas
- `employee_size_min/max` - Company size range
- `revenue_min/max` - Revenue range filters
- `business_type` - B2B/B2C classification
- `pain_points` - Array of customer challenges
- `dreams` - Array of customer aspirations
- `status` - Lifecycle state (`active`, `researching`, `paused`)
- `priority` - Prioritization (`high`, `medium`, `low`)
- `target_revenue` - Revenue goal
- `target_clients` - Client acquisition goal

#### `bd_campaigns`
Outbound campaign execution with conversion tracking.

**Key Fields:**
- `niche_id` - Target niche assignment
- `name` - Campaign identifier
- `campaign_type` - Channel (`linkedin_outbound`, `email_outbound`, `abm`, `cold_calling`, `other`)
- `status` - Execution state (`planning`, `active`, `paused`, `completed`)
- `start_date/end_date` - Campaign timeline
- `target_contacts` - Subset of niche contact roles
- `target_regions` - Subset of niche regions
- `target_contacts_count` - Total contacts to reach
- `actual_contacts_reached` - Contacts engaged
- `responses_received` - Replies/engagement
- `meetings_booked` - Scheduled conversations
- `deals_generated` - Opportunities created
- `owned_by` - Campaign owner
- `created_by` - Campaign creator

## Common Workflows

### 1. Creating a New POD

**Navigation:** `/bd/pods`

**Steps:**
1. Click "Create New POD"
2. Enter POD name and description
3. Select POD lead from user dropdown
4. Set activation status
5. Save POD

**Outcome:** New POD appears in list and becomes available for niche assignment.

### 2. Defining a Target Niche

**Navigation:** `/bd/niches`

**Steps:**
1. Click "Create New Niche"
2. **Basic Information:**
   - Name the niche (e.g., "Financial Services Tech Companies")
   - Write description
   - Select parent POD
   - Set priority level
3. **Targeting Criteria:**
   - Add service offerings (e.g., "Custom Software Development")
   - Select industries (e.g., "Fintech", "Banking")
   - Add target contact roles (e.g., "CTO", "VP of Engineering")
   - Select target regions (e.g., "North America", "Europe")
4. **Company Filters:**
   - Set employee size range (min/max)
   - Set revenue range (min/max)
   - Choose business type (B2B/B2C)
5. **ICP Details:**
   - Add pain points (e.g., "Legacy system modernization")
   - Add dreams/aspirations (e.g., "Digital transformation leadership")
6. **Goals:**
   - Set target revenue
   - Set target client count
7. Set status (`active`, `researching`, or `paused`)
8. Save niche

**Outcome:** Niche is created and ready for campaign assignment.

### 3. Launching a Campaign

**Navigation:** `/bd/strategy/campaigns`

**Steps:**
1. Click "Create New Campaign"
2. **Campaign Setup:**
   - Name the campaign
   - Select target niche
   - Choose campaign type
   - Select campaign owner
3. **Timeline:**
   - Set start date
   - Set end date
4. **Targeting:**
   - Refine contact roles (subset of niche contacts)
   - Refine regions (subset of niche regions)
   - Set target contact count
5. Set initial status (`planning` or `active`)
6. Save campaign

**Outcome:** Campaign is created and appears in campaign list.

### 4. Tracking Campaign Metrics

**Navigation:** `/bd/strategy/campaigns` → Select campaign card (legacy data still available under `/bd/campaigns` as read-only)

**Update Metrics:**
1. Edit campaign
2. Update conversion funnel fields:
   - **Actual Contacts Reached** - Number contacted
   - **Responses Received** - Engagement count
   - **Meetings Booked** - Scheduled calls
   - **Deals Generated** - Opportunities created
3. Update status as campaign progresses
4. Save updates

**Outcome:** Metrics are tracked and visible in campaign cards.

## Conversion Funnel

Campaign metrics follow this funnel:

```
Target Contacts Count
    ↓
Actual Contacts Reached
    ↓
Responses Received
    ↓
Meetings Booked
    ↓
Deals Generated
```

**Typical Conversion Rates:**
- Contacts → Responses: 15-25%
- Responses → Meetings: 50-70%
- Meetings → Deals: 30-50%

## Campaign Types

### LinkedIn Outbound
- Direct messaging via LinkedIn
- InMail campaigns
- Connection requests with messaging

### Email Outbound
- Cold email sequences
- Email nurture campaigns
- Event-based emails

### ABM (Account-Based Marketing)
- Multi-channel targeted campaigns
- Personalized content for specific accounts
- Coordinated sales/marketing efforts

### Cold Calling
- Phone-based outreach
- Follow-up call campaigns
- Discovery call initiatives

### Other
- Event marketing
- Content marketing
- Partnership campaigns

## Sample Data Examples

### Example POD
```json
{
  "id": "11111111-1111-1111-1111-111111111111",
  "name": "Enterprise Solutions",
  "description": "Focused on large enterprise clients in tech and finance sectors",
  "lead_user_id": "06e7b3ed-e627-41e6-b267-4b5abfbead8d",
  "is_active": true
}
```

### Example Target Niche
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
  "target_clients": 5
}
```

### Example Campaign
```json
{
  "id": "ca111111-1111-1111-1111-111111111111",
  "name": "Fintech CTO Outreach Q1 2025",
  "niche_id": "a1111111-1111-1111-1111-111111111111",
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
  "owned_by": "06e7b3ed-e627-41e6-b267-4b5abfbead8d"
}
```

## Best Practices

### POD Management
- Keep PODs focused on clear market verticals
- Assign dedicated leads with domain expertise
- Review POD performance quarterly
- Consolidate or sunset inactive PODs

### Niche Definition
- Use data-driven ICP criteria
- Document pain points from customer interviews
- Keep niches specific enough to personalize outreach
- Review and refine quarterly based on campaign results

### Campaign Execution
- Start campaigns in `planning` status
- Update metrics weekly
- Move to `paused` if response rates drop below 10%
- Archive completed campaigns for historical analysis
- Link successful campaigns to deals in CRM

### Metrics Hygiene
- Update `actual_contacts_reached` daily during active campaigns
- Log all responses, even negative ones
- Track meetings booked immediately
- Connect deals to campaigns when opportunities are created

## Integration Points

### With CRM (`clients`, `deals`)
- Deals generated in campaigns should reference `bd_campaigns.id`
- Clients acquired should be tagged with originating niche
- Contact history should reference campaign touchpoints

### With User Management (`users`, `user_roles`)
- POD leads require `manager` or higher role
- Campaign owners can be any team member
- RLS policies restrict editing to owners and admins

### With Analytics (`analytics_data`)
- Campaign metrics feed into BD dashboard KPIs
- Conversion funnels aggregate across niches
- POD performance rolls up from campaign results

## Access Control

### RLS Policies

**`pods`:**
- All authenticated users can **view**
- Only admins and super_admins can **create/update/delete**

**`target_niches`:**
- All authenticated users can **view**
- Creators can **update/delete** their own niches
- Admins can **update/delete** all niches

**`bd_campaigns`:**
- All authenticated users can **view**
- Creators and owners can **update** their campaigns
- Admins can **update/delete** all campaigns

## Future Enhancements

- AI-powered niche recommendations based on conversion data
- Automated campaign status updates based on metrics
- Integration with email/LinkedIn automation tools
- Predictive analytics for campaign success
- Campaign templates for common use cases

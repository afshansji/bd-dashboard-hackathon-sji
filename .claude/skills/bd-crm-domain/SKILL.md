---
name: bd-crm-domain
description: "Business Development and CRM domain knowledge for SJ BD Dashboard. Covers BD terminology, sales pipeline stages, campaign management, team accountability, and agency-specific workflows."
---

# BD & CRM Domain Knowledge — SJ BD Dashboard

## Business Context

**SJ Innovation** is a technology agency that uses this dashboard internally for Business Development operations. This is NOT a generic CRM — it's purpose-built for an agency's BD team managing outbound campaigns, deal pipelines, client relationships, and team performance.

## Core Domain Concepts

### Deal Pipeline
The deal pipeline represents the sales process from initial contact to closed client.

| Stage | Meaning | Key Actions |
|-------|---------|-------------|
| **Prospecting** | Identifying potential clients | Research, lead import, initial outreach |
| **Qualification** | Determining fit and interest | Discovery calls, needs assessment, budget confirmation |
| **Proposal** | Presenting solution and pricing | Proposal creation, presentation, objection handling |
| **Negotiation** | Finalizing terms | Contract negotiation, scope refinement, legal review |
| **Clients** | Closed-won, active client | Onboarding, project kickoff, ongoing relationship |

**Key metrics per stage:**
- Conversion rate (% moving to next stage)
- Average time in stage
- Deal value distribution
- Win/loss reasons

### Campaigns
Campaigns are structured outreach efforts to generate leads and opportunities.

| Campaign Type | Description |
|---------------|-------------|
| **Email outreach** | Cold email sequences to targeted contacts |
| **LinkedIn outreach** | LinkedIn messages and connection requests |
| **Event-based** | Trade show, webinar, conference follow-ups |
| **Referral** | Partner and client referral programs |
| **Content-based** | Inbound from blog, whitepaper, case studies |

**Campaign lifecycle:**
```
Draft → Active → Paused → Completed
         ↓
    Contacts enrolled → Sequences triggered → Responses tracked → Leads qualified
```

### Email Sequences
Automated multi-step email campaigns with configurable delays and follow-ups.

| Concept | Meaning |
|---------|---------|
| **Sequence** | An ordered set of email steps |
| **Step** | A single email in the sequence (with delay, template, action type) |
| **Enrollment** | A contact being added to a sequence |
| **Execution** | An individual email being sent |
| **Batch processing** | Sending emails in groups to respect rate limits |

### Contacts vs Leads vs Clients
| Entity | Stage | Data Source |
|--------|-------|-------------|
| **Contact** | Known person, not yet qualified | Campaign import, manual entry, CSV upload |
| **Lead** | Qualified prospect with interest | Exa enrichment, AI evaluation, outreach response |
| **Client** | Active customer with signed deal | Deal pipeline (closed-won), Control Tower sync |

### DHS (Daily Head Start)
A daily team health check where BD reps log their activities:

| Metric | What It Measures |
|--------|-----------------|
| **Follow-ups** | Number of follow-up actions completed |
| **Calls** | Outbound/inbound calls made |
| **Meetings** | Client/prospect meetings held |
| **Score (1-10)** | Self-assessed productivity rating |
| **Status** | on_track / at_risk / blocked |

**Business rule**: One submission per user per day (`UNIQUE(user_id, date)`)

### Accountability Chart
Quarterly goal-setting and tracking system:

```
Quarter (Q1 2026)
  └── Team Goals (set by managers)
        └── Rep Goals (set by reps, approved by managers)
              └── Activities (measurable daily/weekly/monthly actions)
                    └── Weekly Updates (progress submissions)
```

**Approval workflow:**
- Draft → Pending Approval → Approved (activities can be added)
- Draft → Pending Approval → Rejected (returns to draft with feedback)

### Pods
Team groupings synced from Control Tower (HubSpot):
- Each pod has a manager and team members
- Pods align with business units or verticals
- Performance is tracked at pod level

## Key Business Metrics

### Campaign Metrics
| Metric | Formula |
|--------|---------|
| **Open rate** | Emails opened / Emails sent |
| **Reply rate** | Replies received / Emails sent |
| **Bounce rate** | Bounced / Emails sent |
| **Conversion rate** | Leads generated / Contacts reached |
| **ROI** | (Revenue - Cost) / Cost |
| **Cost per lead** | Total campaign cost / Leads generated |

### Pipeline Metrics
| Metric | Formula |
|--------|---------|
| **Pipeline value** | Sum of all active deal values |
| **Weighted pipeline** | Sum of (deal value × probability) |
| **Win rate** | Closed-won deals / Total closed deals |
| **Average deal size** | Total revenue / Number of deals |
| **Sales cycle length** | Average days from Prospecting to Client |
| **Stage conversion** | Deals entering next stage / Deals in current stage |

### Team Performance
| Metric | Formula |
|--------|---------|
| **DHS completion rate** | Submissions / Expected submissions |
| **Goal achievement** | Current value / Target value |
| **Activity completion** | Completed activities / Planned activities |
| **Weekly update rate** | Updates submitted / Updates expected |

## Integration Map

### Control Tower (HubSpot)
Bi-directional sync of:
- **Deals** ↔ HubSpot deals
- **Clients** ↔ HubSpot companies
- **Contacts** ↔ HubSpot contacts
- **Employees** ← HubSpot owners
- **Pods** ← HubSpot teams

**Sync direction matters**: Some data originates in HubSpot (employees, pods), some in the dashboard (campaigns, sequences).

### Email Validation (ZeroBounce)
Validates contact email addresses before campaign enrollment:
- Valid → Can be enrolled in sequences
- Invalid → Flagged, excluded from sequences
- Catch-all → Enrolled with caution flag
- Unknown → Queued for re-validation

### Document Signing (PandaDoc)
For proposal and contract signing:
- Create document from template with merge fields
- Add recipients (signers, approvers)
- Track status (draft → sent → viewed → completed)
- Watchers get notifications on status changes

### AI Agents
AI-powered automation for BD tasks:
- **Lead research** — Enrich leads with company/contact data (Exa, Perplexity)
- **Lead evaluation** — Score leads based on fit criteria
- **Follow-up suggestions** — AI-generated next steps
- **Weekly BD review** — Automated team performance analysis
- **Campaign research** — Market and competitor analysis

**Provider fallback chain**: OpenAI → Perplexity → Anthropic → OpenAI Mini

## User Roles in BD Context

| Role | BD Function |
|------|-------------|
| **Team Member / Rep** | Manages own pipeline, submits DHS, executes campaigns, creates goals |
| **Manager** | Oversees team, approves goals, reviews DHS, manages campaigns, sets team targets |
| **Admin** | System configuration, user management, integration setup, SQL access |
| **Super Admin** | Full system access, deployment, security settings |
| **PM (Project Manager)** | Assigned to deals post-close, manages delivery |

## Common BD Workflows

### New Campaign Launch
1. Create campaign (name, type, audience, owner)
2. Import contacts (CSV, Google Sheets, manual)
3. Validate emails (ZeroBounce)
4. Create email sequence (steps, delays, templates)
5. Enroll valid contacts
6. Monitor opens, replies, bounces
7. Qualify responding leads
8. Move qualified leads to deal pipeline

### Deal Progression
1. Lead enters Prospecting
2. BD rep qualifies (discovery call, budget check)
3. Move to Qualification → Proposal
4. Create proposal (PandaDoc)
5. Send for signing
6. Negotiate terms if needed
7. Close deal → Move to Clients
8. Assign PM for delivery

### Weekly BD Review
1. Reps submit DHS daily
2. Reps submit weekly accountability updates
3. Manager reviews team DHS dashboard
4. AI generates weekly BD analysis report
5. Manager reviews pipeline health
6. Team standup to discuss blockers

## Terminology Glossary

| Term | Meaning |
|------|---------|
| **BD** | Business Development |
| **CRM** | Customer Relationship Management |
| **DHS** | Daily Head Start (daily activity tracking) |
| **Pipeline** | Visual representation of deal stages |
| **Sequence** | Automated multi-step email campaign |
| **Enrollment** | Adding a contact to a sequence |
| **ROI** | Return on Investment |
| **MQL** | Marketing Qualified Lead |
| **SQL** | Sales Qualified Lead (not the database language) |
| **Closed-Won** | Deal successfully converted to client |
| **Closed-Lost** | Deal that didn't convert |
| **Churn** | Client leaving/canceling |
| **Pod** | Team grouping (synced from Control Tower) |
| **Control Tower** | HubSpot CRM integration layer |
| **Merge fields** | Template variables in PandaDoc documents |
| **Bounce** | Email that couldn't be delivered |
| **Catch-all** | Email server that accepts all addresses (risky) |

## Industry Compliance

### Email Marketing
- CAN-SPAM compliance: unsubscribe option, physical address, honest subject lines
- GDPR considerations: consent tracking for EU contacts
- Rate limiting: respect SendGrid sending limits
- Bounce handling: remove hard bounces, monitor soft bounces

### Data Privacy
- PII handling: encrypt at rest (Supabase handles this)
- Data retention: archive old campaigns, don't delete
- Access control: RLS ensures data isolation
- Audit trail: user_activity_log tracks all actions

### Business Records
- Deal history must be preserved (no hard deletes)
- Email communication logs retained
- Contract/signing activity tracked
- Financial data (campaign ROI) maintained for reporting

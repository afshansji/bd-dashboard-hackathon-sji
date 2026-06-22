# AI Agent Workflow Backlog

**Purpose**: Prioritized roadmap of AI agents designed to enhance productivity, accelerate sales, optimize campaigns, and improve client success for a USA-based agency with remote employees.

**Last Updated**: 2025-01-12  
**Status Legend**: 🔴 Planned | 🟡 In Progress | 🟢 Completed

---

## Executive Summary

This backlog defines **15 AI agent workflows** organized into 5 functional categories. Each agent is designed to deliver measurable ROI while leveraging existing platform data and infrastructure.

### Priority Matrix

| Priority | Agent Name | Impact | Complexity | Status |
|----------|------------|--------|------------|--------|
| 1 | Daily Manager Intelligence Briefing | High | Medium | 🔴 |
| 2 | Deal Risk Predictor & Alert System | High | Medium | 🔴 |
| 3 | Campaign Health Monitor (Enhanced) | High | Low | 🔴 |
| 4 | Proposal Follow-Up Orchestrator | High | Low | 🔴 |
| 5 | Smart Follow-Up Prioritization | High | Low | 🔴 |
| 6 | Meeting Prep Research Agent | High | Medium | 🔴 |
| 7 | Client Health Score Agent | High | Medium | 🔴 |
| 8 | Real-Time Productivity Alert Agent | Medium | Low | 🔴 |
| 9 | Weekly Team Performance Digest | Medium | Low | 🔴 |
| 10 | Automated EOD Summary Generator | Medium | Low | 🔴 |
| 11 | Win/Loss Analysis Agent | Medium | Medium | 🔴 |
| 12 | Content Performance Optimizer | Medium | Medium | 🔴 |
| 13 | Renewal Risk Predictor | Medium | Medium | 🔴 |
| 14 | Document & Contract Status Agent | Medium | Low | 🔴 |
| 15 | Resource Allocation Optimizer | Medium | High | 🔴 |

### Recommended Implementation Order

**Phase 1 - Quick Wins (Week 1-2)**
- Campaign Health Monitor (C1)
- Proposal Follow-Up Orchestrator (S2)
- Real-Time Productivity Alert Agent (M2)

**Phase 2 - Core Intelligence (Week 3-4)**
- Daily Manager Intelligence Briefing (M1)
- Smart Follow-Up Prioritization (C2)
- Deal Risk Predictor (S1)

**Phase 3 - Advanced Automation (Week 5-8)**
- Meeting Prep Research Agent (M5)
- Client Health Score Agent (R1)
- Win/Loss Analysis Agent (S3)

---

## Category 1: Manager Productivity Agents

### M1: Daily Manager Intelligence Briefing 🔴

**Problem Statement**  
Managers spend 30-60 minutes each morning gathering information across EOD reports, task statuses, deal updates, and alerts. This time could be spent on strategic decisions.

**Trigger**  
- Scheduled: Daily at 6:00 AM (before manager's workday)
- Manual: On-demand via dashboard button

**Input Data Sources**

| Table | Fields Used |
|-------|-------------|
| `eod_reports` | user_id, report_date, accomplishments, challenges, blockers |
| `tasks` | assigned_to, status, due_date, priority, updated_at |
| `deals` | stage, amount, owner_id, updated_at, last_activity_date |
| `control_tower_alerts` | severity, status, triggered_at, entity_type |
| `user_performance_metrics` | user_id, metric_type, value, recorded_at |
| `profiles` | id, full_name, role |

**Output**
- Structured briefing document stored in `ai_agent_runs.structured_output`
- Email digest to manager (optional)
- Dashboard card with key highlights
- Alert creation for critical items needing immediate attention

**Output Format**
```json
{
  "summary": "Executive summary paragraph",
  "team_status": {
    "eod_submitted": 8,
    "eod_missing": 2,
    "blockers_reported": 3
  },
  "deals_update": {
    "moved_forward": 5,
    "at_risk": 2,
    "closing_this_week": 3
  },
  "tasks_status": {
    "overdue": 4,
    "due_today": 12,
    "completed_yesterday": 18
  },
  "priority_actions": [
    {"type": "blocker", "user": "John", "description": "..."},
    {"type": "deal_risk", "deal": "Acme Corp", "reason": "..."}
  ],
  "team_highlights": ["Sarah closed $50K deal", "..."]
}
```

**ROI Justification**
- Time saved: 30-45 min/day per manager
- Faster response to blockers and risks
- Better visibility into remote team productivity

**Complexity**: Medium  
**Estimated Effort**: 3-4 days

**Dependencies**
- Tables: eod_reports, tasks, deals, control_tower_alerts, profiles
- Edge function: run-ai-agent
- Secrets: None (uses Lovable AI)

**Implementation Notes**
- Use existing `run-ai-agent` edge function with new agent configuration
- Create scheduled trigger using pg_cron or external scheduler
- Store agent config in `ai_agents` table

---

### M2: Real-Time Productivity Alert Agent 🔴

**Problem Statement**  
Managers don't have visibility into real-time productivity signals. By the time issues surface, they've already impacted deadlines.

**Trigger**  
- Event-driven: On task status change, EOD submission, deal update
- Scheduled: Every 4 hours for pattern analysis

**Input Data Sources**

| Table | Fields Used |
|-------|-------------|
| `eod_reports` | user_id, report_date, challenges, blockers |
| `tasks` | assigned_to, status, due_date, created_at |
| `deals` | owner_id, stage, last_activity_date |
| `user_performance_metrics` | user_id, metric_type, value |

**Output**
- `control_tower_alerts` entries for detected issues
- Real-time dashboard notifications
- Slack/Email notifications (optional)

**Alert Types Generated**
- EOD not submitted by 6 PM
- Task overdue > 2 days without update
- Deal stale > 7 days without activity
- Performance metric dropped > 20%
- Multiple blockers reported by same user

**ROI Justification**
- Time saved: 15-20 min/day scanning for issues
- Early intervention prevents deadline misses
- Objective productivity tracking for remote teams

**Complexity**: Low  
**Estimated Effort**: 2 days

---

### M3: Weekly Team Performance Digest 🔴

**Problem Statement**  
Weekly performance reviews require manual data gathering from multiple sources, often taking 1-2 hours to prepare.

**Trigger**  
- Scheduled: Every Friday at 4:00 PM

**Input Data Sources**

| Table | Fields Used |
|-------|-------------|
| `user_performance_metrics` | All fields for the week |
| `deals` | created_at, stage changes, amount |
| `tasks` | completed_at, assigned_to |
| `eod_reports` | Week's entries |
| `campaign_contacts` | status changes |

**Output**
- Weekly performance report per team member
- Team aggregate statistics
- Trend analysis (vs. previous week)
- Recognition highlights

**ROI Justification**
- Time saved: 1-2 hours/week per manager
- Consistent, objective performance tracking
- Supports remote team accountability

**Complexity**: Low  
**Estimated Effort**: 2 days

---

### M4: Resource Allocation Optimizer 🔴

**Problem Statement**  
Workload imbalances across remote team members lead to burnout for some while others are underutilized.

**Trigger**  
- Scheduled: Weekly on Monday
- Manual: On-demand before project kickoffs

**Input Data Sources**

| Table | Fields Used |
|-------|-------------|
| `tasks` | assigned_to, status, estimated_hours, due_date |
| `deals` | owner_id, stage, amount, probability |
| `user_availability` | user_id, available_hours, vacation_dates |
| `pods` | member assignments |

**Output**
- Workload distribution visualization
- Reallocation recommendations
- Capacity alerts

**ROI Justification**
- Balanced workload = higher productivity
- Reduced burnout and turnover
- Better project delivery

**Complexity**: High  
**Estimated Effort**: 5-7 days

---

### M5: Meeting Prep Research Agent 🔴

**Problem Statement**  
Sales and account managers spend 20-30 minutes before each call researching prospects, reviewing history, and preparing talking points.

**Trigger**  
- Event-driven: 30 minutes before scheduled meeting
- Manual: On-demand via contact/deal page

**Input Data Sources**

| Table | Fields Used |
|-------|-------------|
| `campaign_contacts` | All profile fields, research_summary |
| `deals` | Related deal history, notes |
| `campaign_contact_linkedin_messages` | Previous outreach |
| `campaign_emails` | Email history |
| `deal_comments` | Internal notes |
| `clients` | Company information |

**External Sources**
- Exa API: Recent news, company updates
- LinkedIn profile data (from stored fields)

**Output**
- One-page call brief with:
  - Contact snapshot
  - Company context
  - Recent news/triggers
  - Relationship history
  - Suggested talking points
  - Discovery questions

**ROI Justification**
- Time saved: 20-30 min per meeting
- Better prepared = higher conversion
- Consistent preparation quality

**Complexity**: Medium  
**Estimated Effort**: 4-5 days

---

## Category 2: Sales & Deal Acceleration Agents

### S1: Deal Risk Predictor & Alert System 🔴

**Problem Statement**  
Deals go cold or get lost without warning. By the time the team notices, it's often too late to recover.

**Trigger**  
- Scheduled: Daily scan of all active deals
- Event-driven: On deal stage change or activity

**Input Data Sources**

| Table | Fields Used |
|-------|-------------|
| `deals` | stage, amount, probability, last_activity_date, created_at |
| `deal_comments` | Sentiment analysis on recent comments |
| `deal_checklist_items` | Completion status |
| `campaign_emails` | Response rates |
| `user_performance_metrics` | Historical win rates by owner |

**Risk Signals Detected**
- No activity in 7+ days
- Stuck in same stage > average time
- Missing checklist items for stage
- Negative sentiment in communications
- Owner has low historical win rate for deal type

**Output**
- Risk score (0-100) per deal
- Risk category: Low / Medium / High / Critical
- `control_tower_alerts` for high-risk deals
- Recommended recovery actions

**ROI Justification**
- Early warning = chance to save deals
- Focus energy on salvageable opportunities
- Improve overall win rate by 5-10%

**Complexity**: Medium  
**Estimated Effort**: 4 days

---

### S2: Proposal Follow-Up Orchestrator 🔴

**Problem Statement**  
Proposals are sent but follow-up is inconsistent. Without systematic follow-up, deals stall.

**Trigger**  
- Event-driven: When deal moves to proposal stage
- Scheduled: Daily check for proposals needing follow-up

**Input Data Sources**

| Table | Fields Used |
|-------|-------------|
| `deals` | stage, pandadoc_proposal_url, owner_id, updated_at |
| `campaign_emails` | Sent proposals and responses |
| `deal_comments` | Follow-up notes |
| `follow_ups` | Scheduled and completed follow-ups |

**Output**
- Auto-created follow-up tasks at optimal intervals
- Personalized follow-up email drafts
- Reminder notifications to deal owner
- Escalation if no response after X attempts

**Follow-up Sequence**
1. Day 2: "Just checking in" email
2. Day 5: Value reinforcement email
3. Day 8: Alternative offer or meeting request
4. Day 12: Final attempt with urgency

**ROI Justification**
- Consistent follow-up = higher close rate
- No proposals fall through cracks
- Automated drafts save 10 min per follow-up

**Complexity**: Low  
**Estimated Effort**: 2-3 days

---

### S3: Win/Loss Analysis Agent 🔴

**Problem Statement**  
Teams don't systematically learn from wins and losses. Patterns that could improve sales performance go unnoticed.

**Trigger**  
- Event-driven: When deal moves to Won or Lost stage
- Scheduled: Monthly aggregate analysis

**Input Data Sources**

| Table | Fields Used |
|-------|-------------|
| `deals` | All fields for closed deals |
| `deal_comments` | Notes and feedback |
| `campaign_contacts` | Contact characteristics |
| `clients` | Company attributes |
| `campaign_emails` | Communication history |

**Output**
- Individual deal analysis report
- Pattern identification across wins/losses
- Recommendations for process improvement
- Benchmarks by deal type, size, industry

**Analysis Dimensions**
- Average sales cycle by outcome
- Common characteristics of won deals
- Failure points for lost deals
- Owner performance comparison
- Lead source quality

**ROI Justification**
- Learn from every deal
- Identify training opportunities
- Improve targeting and messaging

**Complexity**: Medium  
**Estimated Effort**: 4 days

---

## Category 3: Campaign & Outreach Intelligence Agents

### C1: Campaign Health Monitor (Enhanced) 🔴

**Problem Statement**  
Campaigns run without real-time health visibility. Underperforming campaigns waste resources before issues are detected.

**Trigger**  
- Scheduled: Every 6 hours
- Event-driven: On significant metric change

**Input Data Sources**

| Table | Fields Used |
|-------|-------------|
| `bd_campaigns` | status, metrics, target_contacts_count |
| `campaign_contacts` | status distribution, last_status_change_at |
| `campaign_emails` | open_rate, response_rate |
| `campaign_contact_linkedin_messages` | response_received |
| `campaign_kpis` | current_value, target_value |

**Health Indicators**
- Contact progression rate
- Response rate vs benchmark
- Stalled contacts (no activity 14+ days)
- Email deliverability issues
- KPI achievement %

**Output**
- Campaign health score (0-100)
- Health status: Healthy / Warning / Critical
- `control_tower_alerts` for unhealthy campaigns
- Specific recommendations per issue

**ROI Justification**
- Early detection of campaign issues
- Resource reallocation to performing campaigns
- Improved campaign ROI

**Complexity**: Low  
**Estimated Effort**: 2 days

---

### C2: Smart Follow-Up Prioritization Agent 🔴

**Problem Statement**  
Sales reps have long lists of contacts to follow up with but no intelligent way to prioritize. They often work the list top-to-bottom instead of by opportunity.

**Trigger**  
- Scheduled: Daily at 7:00 AM
- Manual: On-demand via dashboard

**Input Data Sources**

| Table | Fields Used |
|-------|-------------|
| `campaign_contacts` | All profile and engagement fields |
| `campaign_contact_linkedin_messages` | response_received, sent_at |
| `campaign_emails` | opened_at, clicked_at |
| `follow_ups` | type, due_date, completed |

**Scoring Factors**
- Engagement recency (email opens, clicks)
- Profile completeness and quality
- Lead quality score
- Intent signals
- Time since last contact
- Contact seniority/decision-making power

**Output**
- Prioritized daily follow-up list per user
- Priority score (1-100) per contact
- Recommended action per contact
- Estimated time to complete

**ROI Justification**
- Focus on highest-value opportunities
- Higher conversion from same effort
- Time saved on manual prioritization

**Complexity**: Low  
**Estimated Effort**: 2-3 days

---

### C3: Content Performance Optimizer 🔴

**Problem Statement**  
Message variants are tested but insights aren't systematically captured and applied to future campaigns.

**Trigger**  
- Scheduled: Weekly analysis
- Event-driven: When variant reaches statistical significance

**Input Data Sources**

| Table | Fields Used |
|-------|-------------|
| `campaign_contact_linkedin_messages` | message_variants, variant_sent, response_received |
| `campaign_emails` | subject, body, opened_at, clicked_at |
| `email_templates` | Performance by template |

**Output**
- Variant performance comparison
- Winning message patterns
- Recommendations for new campaigns
- Updated best practices library

**ROI Justification**
- Continuous message optimization
- Higher response rates over time
- Knowledge capture across team

**Complexity**: Medium  
**Estimated Effort**: 3-4 days

---

## Category 4: Client Success & Retention Agents

### R1: Client Health Score Agent 🔴

**Problem Statement**  
Account managers don't have a unified view of client health. At-risk clients aren't identified until they churn.

**Trigger**  
- Scheduled: Weekly calculation
- Event-driven: On significant client activity

**Input Data Sources**

| Table | Fields Used |
|-------|-------------|
| `clients` | All fields, last_contact_date |
| `deals` | Active and historical deals |
| `contacts` | Engagement frequency |
| `client_intelligence_sessions` | Question patterns, sentiment |
| `tasks` | Open issues, resolution time |

**Health Indicators**
- Communication frequency
- Open issue count and age
- Deal pipeline activity
- Sentiment from communications
- Payment/billing status (if applicable)

**Output**
- Client health score (0-100)
- Health trend (improving/stable/declining)
- At-risk client alerts
- Recommended engagement actions

**ROI Justification**
- Proactive retention > reactive churn recovery
- Identify expansion opportunities
- Improve client satisfaction

**Complexity**: Medium  
**Estimated Effort**: 4 days

---

### R2: Renewal Risk Predictor 🔴

**Problem Statement**  
Contract renewals are often addressed reactively, missing opportunities to upsell or prevent churn.

**Trigger**  
- Scheduled: Monthly scan of upcoming renewals
- Event-driven: 90/60/30 days before renewal

**Input Data Sources**

| Table | Fields Used |
|-------|-------------|
| `deals` | close_date, amount, stage (for renewals) |
| `clients` | Health indicators |
| `tasks` | Open issues |
| `deal_comments` | Sentiment |

**Output**
- Renewal risk score
- `control_tower_alerts` for at-risk renewals
- Recommended save strategies
- Upsell opportunity identification

**ROI Justification**
- Higher renewal rates
- Identify upsell opportunities
- Proactive relationship management

**Complexity**: Medium  
**Estimated Effort**: 3-4 days

---

## Category 5: Administrative & Process Automation Agents

### A1: Automated EOD Summary Generator 🔴

**Problem Statement**  
Team members spend 15-20 minutes writing EOD reports. Often reports are incomplete or skipped.

**Trigger**  
- Scheduled: Daily at 5:00 PM per user's timezone
- Manual: On-demand via dashboard

**Input Data Sources**

| Table | Fields Used |
|-------|-------------|
| `tasks` | Completed/updated today by user |
| `deals` | Activity today by user |
| `campaign_contacts` | Contacts worked today |
| `campaign_emails` | Emails sent today |
| `deal_comments` | Comments added today |

**Output**
- Pre-filled EOD report draft
- Suggested accomplishments list
- Identified blockers from task data
- One-click submission

**ROI Justification**
- Time saved: 10-15 min/day per user
- Higher EOD submission rate
- More consistent report quality

**Complexity**: Low  
**Estimated Effort**: 2 days

---

### A2: Document & Contract Status Agent 🔴

**Problem Statement**  
Contracts and documents in various stages aren't tracked systematically. Items fall through the cracks.

**Trigger**  
- Scheduled: Daily scan
- Event-driven: On document status change

**Input Data Sources**

| Table | Fields Used |
|-------|-------------|
| `deals` | pandadoc_proposal_url, estimate_url |
| `deal_files` | Status, metadata |
| `deal_detail_attachments` | File status |

**Output**
- Document status dashboard
- Pending signature alerts
- Expired document warnings
- Contract renewal reminders

**ROI Justification**
- No documents fall through cracks
- Faster contract turnaround
- Compliance assurance

**Complexity**: Low  
**Estimated Effort**: 2 days

---

## Technical Architecture

### Agent Orchestration Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENT ORCHESTRATOR                        │
│                  (run-ai-agent function)                     │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
   │  Scheduled  │    │   Event     │    │   Manual    │
   │  Triggers   │    │  Triggers   │    │  Triggers   │
   │ (pg_cron)   │    │ (webhooks)  │    │ (UI/API)    │
   └─────────────┘    └─────────────┘    └─────────────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              ▼
                    ┌─────────────────┐
                    │  ai_agents      │
                    │  (config table) │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  ai_agent_runs  │
                    │  (execution log)│
                    └─────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
     ┌─────────────────┐            ┌─────────────────┐
     │ Lovable AI API  │            │    Outputs:     │
     │ (no API key)    │            │ - Alerts        │
     └─────────────────┘            │ - Tasks         │
                                    │ - Reports       │
                                    │ - Notifications │
                                    └─────────────────┘
```

### Shared Resources

- **ai_agents**: Agent configuration and metadata
- **ai_agent_runs**: Execution history and outputs
- **control_tower_alerts**: Unified alert destination
- **Lovable AI**: No-key AI inference

### Database Tables Used

The agents leverage these existing tables:
- `eod_reports` - Daily work summaries
- `tasks` / `task_assignments` - Work tracking
- `deals` - Sales pipeline
- `campaign_contacts` - Outreach targets
- `campaign_emails` - Email tracking
- `user_performance_metrics` - Performance data
- `control_tower_alerts` - Alert system
- `follow_ups` - Follow-up tracking
- `clients` - Account information

---

## RLS & Security Guidelines

### Trigger Pattern for Auto-Set Ownership

```sql
-- Standard trigger for setting created_by on insert
CREATE OR REPLACE FUNCTION public.set_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply to table
CREATE TRIGGER set_created_by_trigger
  BEFORE INSERT ON public.table_name
  FOR EACH ROW
  EXECUTE FUNCTION public.set_created_by();
```

### Standard RLS Policies

```sql
-- User owns their own data
CREATE POLICY "Users can view own records"
  ON public.table_name FOR SELECT
  USING (created_by = auth.uid());

-- Users can create records (ownership set by trigger)
CREATE POLICY "Users can insert records"
  ON public.table_name FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update own records
CREATE POLICY "Users can update own records"
  ON public.table_name FOR UPDATE
  USING (created_by = auth.uid());
```

### Security Checklist for New Tables

- [ ] RLS enabled on table
- [ ] SELECT policy defined
- [ ] INSERT policy with auth check
- [ ] UPDATE policy with ownership check
- [ ] DELETE policy (if needed)
- [ ] created_by trigger attached
- [ ] updated_at trigger attached
- [ ] search_path set on all functions

---

## Implementation Roadmap

### Phase 1: Quick Wins (Week 1-2)
- [ ] C1: Campaign Health Monitor
- [ ] S2: Proposal Follow-Up Orchestrator
- [ ] M2: Real-Time Productivity Alert Agent

### Phase 2: Core Intelligence (Week 3-4)
- [ ] M1: Daily Manager Intelligence Briefing
- [ ] C2: Smart Follow-Up Prioritization
- [ ] S1: Deal Risk Predictor

### Phase 3: Advanced Automation (Week 5-8)
- [ ] M5: Meeting Prep Research Agent
- [ ] R1: Client Health Score Agent
- [ ] S3: Win/Loss Analysis Agent
- [ ] A1: Automated EOD Summary Generator

### Phase 4: Optimization (Week 9+)
- [ ] M3: Weekly Team Performance Digest
- [ ] C3: Content Performance Optimizer
- [ ] R2: Renewal Risk Predictor
- [ ] A2: Document & Contract Status Agent
- [ ] M4: Resource Allocation Optimizer

---

## Implemented Agent Specifications

### BD Weekly Insights Agent ✅

**Status**: Documented | **Priority**: 1 | **Complexity**: Medium

**Overview**: Generates weekly summary of BD team activities, wins, pipeline changes, and action items every Monday.

**Data Sources**:
| Table | Purpose |
|-------|---------|
| deals | Track deals won/lost/created |
| deal_stage_history | Stage progression |
| follow_ups | Completion rates |
| eod_reports | Team blockers/accomplishments |
| campaign_contacts | New contacts, status changes |

**Trigger**: Scheduled Monday 6AM EST or Manual

**Output Highlights**:
- Executive summary (100 words max)
- Wins with owner attribution
- Pipeline health metrics
- Risk flags with mitigation
- Prioritized action items

**Full Specification**: See Feedback ID `5d4f4444-d83f-47f2-970e-9e01fe2793e1`

---

### Deal Pipeline Analyzer Agent ✅

**Status**: Documented | **Priority**: 2 | **Complexity**: Medium

**Overview**: Analyzes pipeline health, identifies bottlenecks, flags stale deals, calculates conversion rates.

**Data Sources**:
| Table | Purpose |
|-------|---------|
| deals | Current pipeline state |
| deal_stage_history | Stage transition timing |
| deal_comments | Activity signals |
| deal_checklist_items | Progress tracking |

**Trigger**: Daily 7AM EST or Manual

**Output Highlights**:
- Health score (0-100)
- Stage breakdown with benchmarks
- Bottleneck identification
- Stale/stuck deals list
- Conversion rate analysis
- Immediate action items

**Full Specification**: See Feedback ID `92864366-aa35-4b1a-b7cc-641943b1cd9f`

---

### BD Research Analyst Agent ✅

**Status**: Documented | **Priority**: 3 | **Complexity**: Medium

**Overview**: Analyzes Exa research data and generates 10 actionable insights for personalized outreach.

**Data Sources**:
| Table | Purpose |
|-------|---------|
| campaign_contacts | Lead profile data |
| campaign_research | Exa API results |
| bd_campaigns | Campaign context |
| clients | Agency capabilities |

**Trigger**: After Exa research completes or Manual

**Output Highlights**:
- Prospect summary with readiness score
- 10 prioritized insights with sources
- Recommended outreach approach
- Talking points and questions to ask
- Objection handling strategies

**Full Specification**: See Feedback ID `747498c6-9a28-41a9-ad97-1cae6fcfe082`

---

### LinkedIn Message Generator Agent ✅

**Status**: Documented | **Priority**: 4 | **Complexity**: Low

**Overview**: Generates 3 personalized LinkedIn message variants with recommendation and reasoning.

**Data Sources**:
| Table | Purpose |
|-------|---------|
| campaign_contacts | Contact profile for personalization |
| bd_campaigns | Campaign context |
| campaign_contact_linkedin_messages | Previous messages (avoid repetition) |
| clients | Agency value props |

**Trigger**: Manual from Contact Detail page or Bulk

**Output Highlights**:
- Contact analysis (priorities, pain points, tone)
- 3 message variants (direct, curiosity, value-first)
- Recommended variant with reasoning
- Follow-up strategy and timing suggestion
- Character count validation (300 char limit)

**Full Specification**: See Feedback ID `72fa51ab-9a18-42b0-97cb-1bdb8125e72d`

---

### Client Objection Handler Agent ✅

**Status**: Documented | **Priority**: 5 | **Complexity**: Medium

**Overview**: Analyzes deal context and documents to provide evidence-based objection responses with scripts.

**Data Sources**:
| Table | Purpose |
|-------|---------|
| deals | Deal context and history |
| deal_files | Document evidence (proposals, requirements) |
| deal_comments | Previous discussions |
| clients | Client background |

**Trigger**: Manual from Deal Detail page

**Output Highlights**:
- Objection categorization (PRICE, TIMING, TRUST, etc.)
- Evidence from documents with citations
- Word-for-word response scripts
- Follow-up if they push back
- Concession strategies if needed

**Full Specification**: See Feedback ID `5f2e219a-cdbd-4eb5-81d4-efd14c88c22b`

---

### Document Q&A Assistant Agent ✅

**Status**: Documented | **Priority**: 6 | **Complexity**: Medium

**Overview**: Natural language Q&A over deal documents with accurate citations.

**Data Sources**:
| Table | Purpose |
|-------|---------|
| deals | Deal context |
| deal_files | Document inventory |
| Supabase Storage | Parsed document JSON content |

**Trigger**: Chat interface on Deal Detail page

**Output Highlights**:
- Direct answers with source citations
- Confidence level with reasoning
- Related information discovered
- Suggested follow-up questions
- Multi-turn conversation support

**Full Specification**: See Feedback ID `7fd7da1c-53d7-4fd5-a4c6-3517013a0c52`

---

### Proposal Gap Analysis Agent ✅

**Status**: Documented | **Priority**: 7 | **Complexity**: Medium

**Overview**: Compares proposals against requirements to identify gaps before submission.

**Data Sources**:
| Table | Purpose |
|-------|---------|
| deals | Deal context |
| deal_files | Proposal and requirements documents |
| Supabase Storage | Parsed document content |

**Trigger**: Manual before proposal submission

**Output Highlights**:
- Coverage score (0-100)
- All requirements extracted with categories
- Gap analysis with severity ratings
- Critical gaps flagged as deal-breakers
- Value-adds identified beyond requirements
- Prioritized fix recommendations

**Full Specification**: See Feedback ID `fe998e02-bac7-450f-aa39-bcd4c1b4f6d6`

---

### Deal Status Intelligence Agent ✅

**Status**: Documented | **Priority**: 8 | **Complexity**: Medium

**Overview**: Analyzes all deal artifacts to generate objective status with win probability.

**Data Sources**:
| Table | Purpose |
|-------|---------|
| deals | Deal metadata |
| deal_files | Meeting notes, documents |
| deal_comments | Internal discussions |
| deal_checklist_items | Progress tracking |
| deal_stage_history | Stage progression |

**Trigger**: Manual or Daily scheduled for active deals

**Output Highlights**:
- Status category (ON_TRACK, AT_RISK, STALLED, etc.)
- Win probability with positive/negative signals
- Blockers with resolution suggestions
- Stakeholder analysis
- Prioritized next steps
- Manager attention flag

**Full Specification**: See Feedback ID `ee9aeb51-e02f-40b3-920d-831b436ff91d`

---

## Success Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Manager daily prep time | 45 min | 15 min | Time tracking |
| Deal risk detection lead time | 0 days | 7 days | Alert timestamps |
| EOD submission rate | 70% | 95% | eod_reports count |
| Campaign issues detected | Manual | Automated | Alert count |
| Follow-up consistency | 60% | 90% | follow_ups completion |
| Client churn prevention | Reactive | Proactive | Health alerts |

---

## Appendix: Tables Needing Triggers

These 13 tables need `created_by` auto-set triggers:

1. ai_agent_runs
2. ai_agent_templates
3. ai_business_context
4. analytics_data
5. brand_kpis
6. brands
7. campaign_contact_linkedin_messages
8. campaign_financial_data
9. campaign_kpis
10. campaign_research
11. campaign_sequences
12. checklist_templates
13. contact_sequence_enrollments

---

*Document maintained by the BD AI Platform team. For technical implementation details, see `/docs/ai-agent-backlog-technical.md`.*

# BD Manager Agent - Implementation Plan

**Created**: January 20, 2026
**Status**: Planning Phase
**Complexity**: High (6-8 week implementation)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture Overview](#system-architecture-overview)
3. [Database Schema Requirements](#database-schema-requirements)
4. [UI Components Requirements](#ui-components-requirements)
5. [AI Agent Configuration](#ai-agent-configuration)
6. [Edge Function Implementation](#edge-function-implementation)
7. [Integration Points](#integration-points)
8. [Implementation Phases](#implementation-phases)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Plan](#deployment-plan)

---

## Executive Summary

### Goal
Build a lightweight internal performance system for the BD team that:
- Captures daily and weekly execution data
- Converts data into clear weekly performance visibility for Admin
- Produces a ready-to-use WIG (Wildly Important Goal) agenda

### Key Components
1. **Quarterly Accountability Chart & Activities** - Track quarterly goals and weekly progress
2. **Upwork Tracker** - Track BD activities and outcomes on Upwork
3. **EOD Tracker** - Daily discipline loop for BD reps
4. **DHS Tracker** - Daily health signal for BD execution
5. **BD Manager Agent** - Automated weekly review and report generation

### Success Metrics
- 100% EOD completion rate by BD reps
- Weekly reports generated automatically every Monday
- Reduced manager time spent on status updates by 80%
- Clear visibility into BD performance trends

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    BD Rep Daily Activities                      │
│  - Submit EOD updates                                           │
│  - Log Upwork activities                                        │
│  - Record DHS metrics                                           │
│  - Update quarterly goal progress                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Database Storage Layer                        │
│  - bd_quarterly_goals                                           │
│  - bd_quarterly_activities                                      │
│  - bd_upwork_activities                                         │
│  - bd_eod_logs                                                  │
│  - bd_dhs_logs                                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│            BD Manager Agent (Scheduled Weekly)                  │
│  - Queries all tracking data for the week                      │
│  - Analyzes performance patterns                                │
│  - Identifies risks and blockers                                │
│  - Generates insights and recommendations                       │
│  - Creates WIG-ready agenda                                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Weekly Report Delivery                         │
│  - Email to designated admin/manager                            │
│  - Dashboard view with interactive charts                       │
│  - PDF export for meetings                                      │
│  - Action items auto-created in tasks system                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema Requirements

### 1. Quarterly Goals & Activities

#### Table: `bd_quarterly_goals`
```sql
CREATE TABLE bd_quarterly_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Goal details
  title TEXT NOT NULL,
  description TEXT,
  quarter TEXT NOT NULL, -- e.g., "Q1 2026"
  year INTEGER NOT NULL,

  -- Ownership
  assigned_to UUID REFERENCES profiles(id), -- NULL = team-level goal
  goal_type TEXT NOT NULL CHECK (goal_type IN ('individual', 'team')),

  -- Metrics
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit TEXT, -- e.g., "deals", "revenue", "proposals"

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'on_track'
    CHECK (status IN ('on_track', 'at_risk', 'off_track', 'completed')),
  progress_percentage NUMERIC DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),

  -- Context
  blockers TEXT[],
  help_needed TEXT,
  notes TEXT,

  -- Metadata
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Indexes
  CONSTRAINT unique_quarterly_goal UNIQUE (assigned_to, title, quarter, year)
);

CREATE INDEX idx_bd_quarterly_goals_quarter ON bd_quarterly_goals(quarter, year);
CREATE INDEX idx_bd_quarterly_goals_assigned ON bd_quarterly_goals(assigned_to);
CREATE INDEX idx_bd_quarterly_goals_status ON bd_quarterly_goals(status);
```

#### Table: `bd_quarterly_activities`
```sql
CREATE TABLE bd_quarterly_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Link to goal
  goal_id UUID REFERENCES bd_quarterly_goals(id) ON DELETE CASCADE NOT NULL,

  -- Activity details
  activity_name TEXT NOT NULL,
  description TEXT,
  weekly_commitment TEXT, -- e.g., "5 proposals per week"

  -- Progress tracking
  week_start_date DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  actual_value NUMERIC,
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Indexes
  CONSTRAINT unique_weekly_activity UNIQUE (goal_id, week_start_date, activity_name)
);

CREATE INDEX idx_bd_quarterly_activities_goal ON bd_quarterly_activities(goal_id);
CREATE INDEX idx_bd_quarterly_activities_week ON bd_quarterly_activities(week_start_date);
```

---

### 2. Upwork Tracker

**Data Source**: Google Sheets
**URL**: https://docs.google.com/spreadsheets/d/1vEpdB36TWmNro3wYCYq62k-khLXhdmWnonabkBT-P1Q/edit?gid=513030245#gid=513030245

#### Integration Approach

Instead of creating a separate database table, the BD Manager Agent will fetch Upwork data directly from the Google Sheet using Google Sheets API v4.

#### Table: `bd_upwork_sync_metadata` (Cache & Tracking Only)
```sql
CREATE TABLE bd_upwork_sync_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Sync tracking
  last_sync_at TIMESTAMPTZ NOT NULL,
  sync_status TEXT NOT NULL CHECK (sync_status IN ('success', 'failed', 'in_progress')),
  rows_synced INTEGER,

  -- Cache of latest data (JSONB for flexibility)
  cached_data JSONB,

  -- Error tracking
  error_message TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bd_upwork_sync_metadata_sync ON bd_upwork_sync_metadata(last_sync_at);
```

#### Google Sheets Schema Expected

The Google Sheet should have columns:
- **Date** (YYYY-MM-DD format)
- **BD Rep Name** (Full name matching profiles table)
- **Proposals Sent**
- **Invites Received**
- **Interviews Booked**
- **Wins**
- **Losses**
- **Estimated Value** (numeric)
- **Actual Revenue** (numeric)
- **Notes** (optional)
- **Job Titles** (comma-separated, optional)

---

### 3. EOD (End of Day) Tracker

#### Table: `bd_eod_logs`
```sql
CREATE TABLE bd_eod_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- User tracking
  bd_rep_id UUID REFERENCES profiles(id) NOT NULL,

  -- Date tracking
  eod_date DATE NOT NULL,

  -- EOD content
  accomplished_today TEXT NOT NULL,
  working_on_tomorrow TEXT NOT NULL,
  blockers TEXT,
  help_needed TEXT,

  -- Key numbers (flexible JSONB for custom metrics)
  key_numbers JSONB DEFAULT '{}',
  -- Example: { "calls": 5, "emails": 12, "meetings": 2, "proposals": 1 }

  -- Mood/confidence (optional)
  confidence_level INTEGER CHECK (confidence_level BETWEEN 1 AND 5),

  -- Metadata
  submitted_at TIMESTAMPTZ DEFAULT now(),
  is_late BOOLEAN DEFAULT false, -- Flagged if submitted after cutoff time

  -- Constraints
  CONSTRAINT unique_eod_per_day UNIQUE (bd_rep_id, eod_date)
);

CREATE INDEX idx_bd_eod_logs_rep ON bd_eod_logs(bd_rep_id);
CREATE INDEX idx_bd_eod_logs_date ON bd_eod_logs(eod_date);
CREATE INDEX idx_bd_eod_logs_late ON bd_eod_logs(is_late) WHERE is_late = true;
```

---

### 4. DHS (Daily Health Score) Tracker

#### Table: `bd_dhs_logs`
```sql
CREATE TABLE bd_dhs_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- User tracking
  bd_rep_id UUID REFERENCES profiles(id) NOT NULL,

  -- Date tracking
  dhs_date DATE NOT NULL,

  -- Health indicators (checklist-based)
  followups_done INTEGER DEFAULT 0,
  calls_made INTEGER DEFAULT 0,
  meetings_booked INTEGER DEFAULT 0,
  pipeline_updated BOOLEAN DEFAULT false,
  emails_sent INTEGER DEFAULT 0,
  linkedin_actions INTEGER DEFAULT 0,

  -- Overall score (auto-calculated or manual)
  health_score INTEGER CHECK (health_score BETWEEN 0 AND 100),
  status TEXT CHECK (status IN ('healthy', 'warning', 'critical')),

  -- Notes
  notes TEXT,
  exceptions TEXT, -- Why score is low if applicable

  -- Metadata
  submitted_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_dhs_per_day UNIQUE (bd_rep_id, dhs_date)
);

CREATE INDEX idx_bd_dhs_logs_rep ON bd_dhs_logs(bd_rep_id);
CREATE INDEX idx_bd_dhs_logs_date ON bd_dhs_logs(dhs_date);
CREATE INDEX idx_bd_dhs_logs_status ON bd_dhs_logs(status);
```

---

### 5. Weekly Reports Storage

#### Table: `bd_weekly_reports`
```sql
CREATE TABLE bd_weekly_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Time period
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  quarter TEXT NOT NULL,

  -- Report content
  summary TEXT NOT NULL,
  wig_agenda JSONB NOT NULL,
  -- Structure: { wins: [], metrics: {}, progress_vs_goals: [], risks: [], coaching_focus: [], action_items: [] }

  -- Performance insights
  rep_performance JSONB NOT NULL,
  -- Structure: [{ rep_id: uuid, rep_name: string, status: string, highlights: [], concerns: [] }]

  -- Aggregated metrics
  team_metrics JSONB NOT NULL,
  -- Structure: { total_proposals: 0, total_wins: 0, avg_dhs: 0, eod_completion_rate: 0 }

  -- AI analysis
  ai_insights TEXT[],
  risk_alerts TEXT[],
  coaching_recommendations TEXT[],

  -- Report metadata
  generated_by UUID REFERENCES ai_agents(id),
  generated_at TIMESTAMPTZ DEFAULT now(),
  report_status TEXT DEFAULT 'draft' CHECK (report_status IN ('draft', 'published', 'archived')),

  -- Delivery tracking
  sent_to UUID[], -- Array of profile IDs who received the report
  sent_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_weekly_report UNIQUE (week_start_date)
);

CREATE INDEX idx_bd_weekly_reports_week ON bd_weekly_reports(week_start_date);
CREATE INDEX idx_bd_weekly_reports_quarter ON bd_weekly_reports(quarter);
```

---

### 6. Row-Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE bd_quarterly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE bd_quarterly_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE bd_upwork_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE bd_eod_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bd_dhs_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bd_weekly_reports ENABLE ROW LEVEL SECURITY;

-- BD Reps can read/write their own data
CREATE POLICY "BD reps can manage own goals"
  ON bd_quarterly_goals
  FOR ALL
  USING (
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin', 'manager')
    )
  );

-- Upwork data comes from Google Sheets (read-only via API)
-- No RLS needed for bd_upwork_activities table (removed)

CREATE POLICY "Service role can manage upwork sync metadata"
  ON bd_upwork_sync_metadata
  FOR ALL
  USING (true); -- Only service role accesses this

CREATE POLICY "BD reps can manage own EOD logs"
  ON bd_eod_logs
  FOR ALL
  USING (
    bd_rep_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin', 'manager')
    )
  );

CREATE POLICY "BD reps can manage own DHS logs"
  ON bd_dhs_logs
  FOR ALL
  USING (
    bd_rep_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin', 'manager')
    )
  );

-- Managers and admins can read all reports
CREATE POLICY "Managers can read weekly reports"
  ON bd_weekly_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin', 'manager')
    )
  );

-- Only the agent (service role) can write reports
CREATE POLICY "Agent can create weekly reports"
  ON bd_weekly_reports
  FOR INSERT
  WITH CHECK (true); -- Service role will create these
```

---

## Google Sheets API Integration

### Setup Steps

1. **Enable Google Sheets API**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google Sheets API v4
   - Create Service Account credentials
   - Download JSON key file

2. **Share Google Sheet with Service Account**
   - Copy service account email from JSON key
   - Share the Google Sheet with this email (Viewer access)
   - Sheet ID: `1vEpdB36TWmNro3wYCYq62k-khLXhdmWnonabkBT-P1Q`
   - Tab: `gid=513030245`

3. **Store Credentials in Supabase**
   ```sql
   -- Store in Supabase Vault (encrypted)
   INSERT INTO vault.secrets (name, secret)
   VALUES ('GOOGLE_SHEETS_SERVICE_ACCOUNT', '{ ... json key content ... }');
   ```

4. **Environment Variables**
   ```bash
   GOOGLE_SHEETS_API_KEY=your_api_key
   GOOGLE_SHEET_ID=1vEpdB36TWmNro3wYCYq62k-khLXhdmWnonabkBT-P1Q
   GOOGLE_SHEET_UPWORK_TAB_NAME=Sheet1
   ```

### Helper Function: `fetchUpworkDataFromSheets.ts`

**Location**: `supabase/functions/_shared/fetchUpworkDataFromSheets.ts`

```typescript
import { GoogleAuth } from 'https://esm.sh/@google-cloud/auth@9.0.0';

interface UpworkRow {
  date: string;
  bdRepName: string;
  proposalsSent: number;
  invitesReceived: number;
  interviewsBooked: number;
  wins: number;
  losses: number;
  estimatedValue: number;
  actualRevenue: number;
  notes?: string;
  jobTitles?: string[];
}

export async function fetchUpworkDataFromSheets(
  weekStartDate: Date,
  weekEndDate: Date
): Promise<UpworkRow[]> {
  try {
    // Get credentials from Supabase Vault
    const credentials = JSON.parse(Deno.env.get('GOOGLE_SHEETS_SERVICE_ACCOUNT')!);

    // Initialize Google Auth
    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    // Fetch data from Google Sheets
    const sheetId = Deno.env.get('GOOGLE_SHEET_ID')!;
    const range = Deno.env.get('GOOGLE_SHEET_UPWORK_TAB_NAME') || 'Sheet1';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}!A:K`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken.token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Google Sheets API error: ${response.statusText}`);
    }

    const data = await response.json();
    const rows = data.values;

    if (!rows || rows.length === 0) {
      return [];
    }

    // Parse rows (assuming first row is header)
    const headers = rows[0];
    const dataRows = rows.slice(1);

    const upworkData: UpworkRow[] = dataRows
      .map((row: any[]) => {
        const date = row[0];
        const rowDate = new Date(date);

        // Filter by date range
        if (rowDate < weekStartDate || rowDate > weekEndDate) {
          return null;
        }

        return {
          date,
          bdRepName: row[1],
          proposalsSent: parseInt(row[2]) || 0,
          invitesReceived: parseInt(row[3]) || 0,
          interviewsBooked: parseInt(row[4]) || 0,
          wins: parseInt(row[5]) || 0,
          losses: parseInt(row[6]) || 0,
          estimatedValue: parseFloat(row[7]) || 0,
          actualRevenue: parseFloat(row[8]) || 0,
          notes: row[9] || '',
          jobTitles: row[10] ? row[10].split(',').map((t: string) => t.trim()) : []
        };
      })
      .filter((row): row is UpworkRow => row !== null);

    return upworkData;

  } catch (error) {
    console.error('Error fetching Upwork data from Google Sheets:', error);
    throw error;
  }
}

// Helper: Aggregate Upwork data by rep
export function aggregateUpworkByRep(upworkData: UpworkRow[]) {
  const byRep: Record<string, {
    proposals: number;
    invites: number;
    interviews: number;
    wins: number;
    losses: number;
    estimatedValue: number;
    actualRevenue: number;
  }> = {};

  for (const row of upworkData) {
    if (!byRep[row.bdRepName]) {
      byRep[row.bdRepName] = {
        proposals: 0,
        invites: 0,
        interviews: 0,
        wins: 0,
        losses: 0,
        estimatedValue: 0,
        actualRevenue: 0
      };
    }

    byRep[row.bdRepName].proposals += row.proposalsSent;
    byRep[row.bdRepName].invites += row.invitesReceived;
    byRep[row.bdRepName].interviews += row.interviewsBooked;
    byRep[row.bdRepName].wins += row.wins;
    byRep[row.bdRepName].losses += row.losses;
    byRep[row.bdRepName].estimatedValue += row.estimatedValue;
    byRep[row.bdRepName].actualRevenue += row.actualRevenue;
  }

  return byRep;
}
```

---

## UI Components Requirements

### 1. BD Rep Dashboard Components

#### Component: `BDRepDashboard.tsx`
**Location**: `src/pages/bd/BDRepDashboard.tsx`

**Purpose**: Central hub for BD reps to manage daily activities

**Features**:
- Quick EOD submission form
- DHS checklist tracker
- Upwork activity logger
- Quarterly goals progress view
- Weekly summary cards

**UI Sections**:
```
┌─────────────────────────────────────────────────────────────┐
│  BD Performance Dashboard                           🎯       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ EOD Status      │  │ DHS Score       │  │ This Week   │ │
│  │ ⚠️ Not submitted│  │ 85/100 ✅       │  │ 3 wins      │ │
│  │ [Submit Now]    │  │ [Update]        │  │ 12 proposals│ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Quick EOD Submission                                  │  │
│  │ What I accomplished today:                            │  │
│  │ [Text area...]                                        │  │
│  │                                                        │  │
│  │ Working on tomorrow:                                  │  │
│  │ [Text area...]                                        │  │
│  │                                                        │  │
│  │ Blockers / Help needed:                               │  │
│  │ [Text area...]                                        │  │
│  │                                                        │  │
│  │ Key numbers: Calls: [5] Emails: [12] Meetings: [2]  │  │
│  │                                                        │  │
│  │                               [Submit EOD] [Save Draft]│  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Upwork Activity Summary (This Week)                   │  │
│  │ Data synced from Google Sheets                        │  │
│  │                                                        │  │
│  │ Proposals sent: 12    Invites: 5     Interviews: 2    │  │
│  │ Wins: 1              Estimated value: $15,000         │  │
│  │                                                        │  │
│  │ Last synced: 2 hours ago                              │  │
│  │ [View in Google Sheets] [Refresh]                     │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ My Quarterly Goals (Q1 2026)                          │  │
│  │                                                        │  │
│  │ ✅ Close 10 deals          [8/10] ████████░░ 80%     │  │
│  │    Status: On Track                                   │  │
│  │                                                        │  │
│  │ ⚠️ Generate $50K revenue   [$38K/$50K] ███████░░░ 76%│  │
│  │    Status: At Risk - Need 2 more big wins            │  │
│  │                                                        │  │
│  │ [View All Goals] [Update Progress]                    │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

#### Component: `EODSubmissionForm.tsx`
**Location**: `src/components/bd/tracking/EODSubmissionForm.tsx`

**Props**:
```typescript
interface EODSubmissionFormProps {
  date: Date;
  onSubmit: (data: EODFormData) => Promise<void>;
  initialData?: Partial<EODFormData>;
}

interface EODFormData {
  accomplishedToday: string;
  workingOnTomorrow: string;
  blockers?: string;
  helpNeeded?: string;
  keyNumbers: {
    calls?: number;
    emails?: number;
    meetings?: number;
    proposals?: number;
    [key: string]: number | undefined;
  };
  confidenceLevel?: 1 | 2 | 3 | 4 | 5;
}
```

**Validation**:
- Required: accomplishedToday, workingOnTomorrow
- Optional: blockers, helpNeeded, keyNumbers, confidenceLevel
- Character limits: accomplishedToday (min 20, max 500), workingOnTomorrow (min 10, max 300)

---

#### Component: `DHSTracker.tsx`
**Location**: `src/components/bd/tracking/DHSTracker.tsx`

**Purpose**: Daily health score checklist and submission

**UI**:
```
┌─────────────────────────────────────────────────────────┐
│  Daily Health Score - January 20, 2026                  │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ☑️ Follow-ups completed: [5]                            │
│  ☑️ Calls made: [8]                                      │
│  ☑️ Meetings booked: [2]                                 │
│  ☑️ Pipeline updated: Yes                                │
│  ☑️ Emails sent: [15]                                    │
│  ☑️ LinkedIn actions: [10]                               │
│                                                           │
│  ────────────────────────────────────────────────────    │
│  Overall Health Score: 85/100 ✅                         │
│  Status: Healthy                                         │
│                                                           │
│  Notes: [Optional notes...]                              │
│                                                           │
│                                    [Submit] [Save Draft] │
└─────────────────────────────────────────────────────────┘
```

**Scoring Logic**:
```typescript
function calculateDHSScore(data: DHSData): number {
  const weights = {
    followups_done: 20,
    calls_made: 15,
    meetings_booked: 25,
    pipeline_updated: 20,
    emails_sent: 10,
    linkedin_actions: 10
  };

  const targets = {
    followups_done: 5,
    calls_made: 8,
    meetings_booked: 2,
    pipeline_updated: true,
    emails_sent: 10,
    linkedin_actions: 5
  };

  let score = 0;
  if (data.pipeline_updated) score += weights.pipeline_updated;

  score += Math.min(data.followups_done / targets.followups_done, 1) * weights.followups_done;
  score += Math.min(data.calls_made / targets.calls_made, 1) * weights.calls_made;
  score += Math.min(data.meetings_booked / targets.meetings_booked, 1) * weights.meetings_booked;
  score += Math.min(data.emails_sent / targets.emails_sent, 1) * weights.emails_sent;
  score += Math.min(data.linkedin_actions / targets.linkedin_actions, 1) * weights.linkedin_actions;

  return Math.round(score);
}

function determineStatus(score: number): 'healthy' | 'warning' | 'critical' {
  if (score >= 80) return 'healthy';
  if (score >= 60) return 'warning';
  return 'critical';
}
```

---

#### Component: `UpworkActivityViewer.tsx`
**Location**: `src/components/bd/tracking/UpworkActivityViewer.tsx`

**Purpose**: Display Upwork activity data from Google Sheets (read-only)

**Features**:
- Weekly summary view (fetched from Google Sheets)
- Trend charts (proposals, invites, interviews, wins)
- Comparison to targets
- Link to Google Sheet for data entry
- Refresh button to sync latest data
- Loading state while fetching

**Props**:
```typescript
interface UpworkActivityViewerProps {
  repId?: string; // If provided, shows only this rep's data
  weekStartDate?: Date; // Default to current week
}
```

**Data Flow**:
```
1. Component mounts → Fetch data from Edge Function
2. Edge Function → Fetches from Google Sheets API
3. Display aggregated metrics
4. User clicks "Refresh" → Re-fetch from Google Sheets
5. User clicks "View in Google Sheets" → Opens sheet URL
```

---

#### Component: `QuarterlyGoalsManager.tsx`
**Location**: `src/components/bd/tracking/QuarterlyGoalsManager.tsx`

**Features**:
- Goal creation wizard
- Progress tracking
- Status updates (On Track / At Risk / Off Track)
- Activity breakdown
- Weekly commitment tracking

---

### 2. Manager/Admin Dashboard Components

#### Component: `BDManagerDashboard.tsx`
**Location**: `src/pages/admin/BDManagerDashboard.tsx`

**Purpose**: High-level view of BD team performance

**UI Sections**:
```
┌─────────────────────────────────────────────────────────────┐
│  BD Team Performance Dashboard                       📊      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ Team DHS Avg    │  │ EOD Completion  │  │ This Week   │ │
│  │ 82/100 ✅       │  │ 85% ⚠️          │  │ 12 wins     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Latest Weekly Report                                  │  │
│  │ Week of Jan 13-19, 2026                               │  │
│  │                                                        │  │
│  │ Key Highlights:                                       │  │
│  │ ✅ Team closed 12 deals (target: 10)                  │  │
│  │ ⚠️ Upwork proposals down 15% from last week          │  │
│  │ ⚠️ 3 reps missed EOD submissions                     │  │
│  │                                                        │  │
│  │ [View Full Report] [Download PDF]                     │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Rep Performance Summary                               │  │
│  │                                                        │  │
│  │ Name           DHS   EOD%   Upwork   Status          │  │
│  │ ───────────────────────────────────────────────────  │  │
│  │ John Doe       92    100%   ↑ 20%    🟢 Excellent    │  │
│  │ Jane Smith     78    80%    → 0%     🟡 Needs help   │  │
│  │ Bob Johnson    65    60%    ↓ 15%    🔴 At risk      │  │
│  │                                                        │  │
│  │ [View Details] [Schedule Review]                      │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ WIG Agenda (Next Meeting)                             │  │
│  │                                                        │  │
│  │ 1. Wins:                                              │  │
│  │    • Closed $125K deal with Acme Corp                 │  │
│  │    • John secured 3 new enterprise leads              │  │
│  │                                                        │  │
│  │ 2. Metrics Review:                                    │  │
│  │    • Team DHS: 82 (target: 85)                        │  │
│  │    • Proposals: 45 (target: 50)                       │  │
│  │                                                        │  │
│  │ 3. Risks & Blockers:                                  │  │
│  │    • Bob needs help with enterprise sales skills      │  │
│  │    • Jane's pipeline running low                      │  │
│  │                                                        │  │
│  │ [Edit Agenda] [Start Meeting] [Export]               │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

#### Component: `WeeklyReportViewer.tsx`
**Location**: `src/components/bd/reports/WeeklyReportViewer.tsx`

**Features**:
- Week selector
- Report summary view
- Drill-down into individual metrics
- Rep-level performance cards
- WIG agenda export
- PDF download
- Email distribution

---

#### Component: `BDPerformanceCharts.tsx`
**Location**: `src/components/bd/reports/BDPerformanceCharts.tsx`

**Charts**:
1. **DHS Trend Chart** - Line chart showing daily DHS scores per rep over 4 weeks
2. **EOD Completion Rate** - Bar chart showing weekly EOD completion by rep
3. **Upwork Pipeline Funnel** - Funnel chart: Proposals → Invites → Interviews → Wins
4. **Quarterly Goals Progress** - Stacked progress bars for each goal
5. **Team Performance Heatmap** - Calendar heatmap showing activity levels

---

### 3. AI Agent Runner Component

#### Component: `BDManagerAgentRunner.tsx`
**Location**: `src/features/ai/agents/BDManagerAgentRunner.tsx`

**Purpose**: Interface for manually triggering BD Manager Agent

**Features**:
- Week selection
- Preview data being analyzed
- Force re-run for past weeks
- View generated report inline
- Send report manually

**UI**:
```
┌─────────────────────────────────────────────────────────┐
│  BD Manager Agent Runner                                 │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Select Week:                                            │
│  [Week of Jan 13-19, 2026 ▼]                            │
│                                                           │
│  Data Preview:                                           │
│  ✅ Quarterly goals: 15 tracked                          │
│  ✅ Upwork activities: 45 entries                        │
│  ✅ EOD logs: 42/50 submitted (84%)                      │
│  ✅ DHS logs: 48/50 submitted (96%)                      │
│                                                           │
│  Options:                                                │
│  ☐ Force re-run (overwrite existing report)             │
│  ☐ Send email after generation                          │
│                                                           │
│  Recipients:                                             │
│  [Select users...] 👤 Admin, 👤 Manager                 │
│                                                           │
│               [Preview Data] [Run Agent] [Cancel]        │
│                                                           │
│  ───────────────────────────────────────────────────────│
│                                                           │
│  Last Run: Jan 20, 2026 at 9:00 AM                      │
│  Status: ✅ Completed                                    │
│  Duration: 12 seconds                                    │
│  [View Report]                                           │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## AI Agent Configuration

### Agent Record in `ai_agents` Table

```sql
INSERT INTO ai_agents (
  name,
  description,
  slug,
  type,
  category,
  system_prompt,
  prompt_template,
  config,
  is_active,
  is_enabled,
  schedule_config,
  min_role_required,
  benefits,
  use_cases,
  created_by
) VALUES (
  'BD Manager Agent',
  'Automated weekly performance review agent for BD team. Analyzes quarterly goals, Upwork activities, EOD logs, and DHS scores to generate comprehensive weekly reports and WIG agendas.',
  'bd-manager-weekly-review',
  'performance_analysis',
  'bd_performance',

  -- System Prompt
  'You are the BD Manager Agent, an AI assistant specializing in analyzing Business Development team performance data.

Your responsibilities:
1. Analyze weekly BD execution data across multiple tracking systems
2. Identify performance trends, risks, and opportunities
3. Generate actionable insights for managers and coaches
4. Create WIG (Wildly Important Goal) agendas for team meetings
5. Highlight blockers and provide coaching recommendations

Data sources you analyze:
- Quarterly Accountability Chart & Activities
- Upwork Tracker (proposals, invites, interviews, wins)
- EOD Tracker (daily accomplishments and blockers)
- DHS Tracker (daily health scores)

Output requirements:
- Clear, concise executive summary
- Rep-by-rep performance analysis
- Team-level metrics and trends
- Specific risks and early warning signals
- Actionable coaching recommendations
- WIG-ready agenda format

Tone: Professional, data-driven, supportive, and action-oriented.',

  -- Prompt Template
  'Analyze BD team performance for the week of {{week_start_date}} to {{week_end_date}}.

## Data Summary

### Quarterly Goals (Q{{quarter}} {{year}})
{{quarterly_goals_summary}}

### Upwork Activities
{{upwork_summary}}

### EOD Completion
{{eod_summary}}

### DHS Scores
{{dhs_summary}}

## Analysis Instructions

1. **Executive Summary**
   - Provide a 2-3 sentence overview of team performance this week
   - Highlight the most significant wins and concerns

2. **Rep-by-Rep Analysis**
   For each BD rep, assess:
   - Progress toward quarterly goals
   - Upwork activity level and results
   - EOD submission consistency
   - DHS trend (improving/declining/stable)
   - Overall status: Excellent / On Track / Needs Support / At Risk
   - Specific highlights and concerns

3. **Team Metrics**
   - Total proposals sent (target: {{team_target_proposals}})
   - Total wins (target: {{team_target_wins}})
   - Average DHS score (target: 85+)
   - EOD completion rate (target: 100%)
   - Trends vs last week

4. **Risk Identification**
   Flag these critical issues:
   - Reps with declining DHS scores (2+ weeks)
   - Missing EOD submissions (3+ days)
   - Low Upwork activity (below 50% of target)
   - Quarterly goals marked "Off Track"
   - Repeated blockers not resolved

5. **Coaching Recommendations**
   - Specific actions for manager to take this week
   - Which reps need 1-on-1 attention
   - Skills gaps to address
   - Process improvements

6. **WIG Agenda**
   Structure:
   - Wins (top 3-5 achievements)
   - Metrics Review (vs targets)
   - Progress vs Quarterly Goals
   - Risks & Stuck Items
   - Coaching Focus Areas
   - Action Items for Next Week

Provide your analysis in structured JSON format matching the AgentResponseSchema.',

  -- Config (JSONB)
  '{
    "providers": {
      "primary": {
        "provider": "openai",
        "model": "gpt-4o"
      },
      "fallback": {
        "provider": "openai",
        "model": "gpt-4o-mini"
      }
    },
    "features": {
      "enableResearch": false,
      "enableTelemetry": true
    },
    "outputSchema": {
      "type": "object",
      "required": ["summary", "rep_performance", "team_metrics", "risks", "coaching_recommendations", "wig_agenda"],
      "properties": {
        "summary": {
          "type": "string",
          "description": "Executive summary of the week"
        },
        "rep_performance": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "rep_id": { "type": "string" },
              "rep_name": { "type": "string" },
              "status": { "enum": ["excellent", "on_track", "needs_support", "at_risk"] },
              "highlights": { "type": "array", "items": { "type": "string" } },
              "concerns": { "type": "array", "items": { "type": "string" } },
              "quarterly_progress": { "type": "number", "description": "Percentage" },
              "dhs_avg": { "type": "number" },
              "eod_completion_rate": { "type": "number" }
            }
          }
        },
        "team_metrics": {
          "type": "object",
          "properties": {
            "total_proposals": { "type": "number" },
            "total_wins": { "type": "number" },
            "avg_dhs": { "type": "number" },
            "eod_completion_rate": { "type": "number" },
            "trend_vs_last_week": { "type": "string" }
          }
        },
        "risks": {
          "type": "array",
          "items": { "type": "string" }
        },
        "coaching_recommendations": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "rep_name": { "type": "string" },
              "recommendation": { "type": "string" },
              "priority": { "enum": ["high", "medium", "low"] }
            }
          }
        },
        "wig_agenda": {
          "type": "object",
          "properties": {
            "wins": { "type": "array", "items": { "type": "string" } },
            "metrics_review": { "type": "object" },
            "progress_vs_goals": { "type": "array" },
            "risks_and_stuck_items": { "type": "array" },
            "coaching_focus": { "type": "array" },
            "action_items": { "type": "array" }
          }
        }
      }
    }
  }'::jsonb,

  true, -- is_active
  true, -- is_enabled

  -- Schedule Config
  '{
    "type": "scheduled",
    "frequency": "weekly",
    "day_of_week": "monday",
    "time": "09:00",
    "timezone": "America/New_York",
    "enabled": true
  }'::jsonb,

  'manager', -- min_role_required

  -- Benefits
  ARRAY[
    'Automated weekly performance tracking',
    '80% reduction in manual reporting time',
    'Early identification of at-risk reps',
    'Data-driven coaching recommendations',
    'Ready-to-use WIG agendas'
  ],

  -- Use Cases
  ARRAY[
    'Weekly team performance review',
    'Manager preparation for 1-on-1s',
    'Quarterly goal tracking',
    'BD pipeline health monitoring',
    'Performance trend analysis'
  ],

  (SELECT id FROM profiles WHERE email = 'admin@sjinnovation.com' LIMIT 1)
);
```

---

## Edge Function Implementation

### Primary Function: `bd-manager-agent`

**Location**: `supabase/functions/bd-manager-agent/index.ts`

**Responsibilities**:
1. Query all tracking data for the specified week
2. Aggregate and structure data for AI analysis
3. Invoke OpenAI GPT-4o with structured prompt
4. Parse and validate response
5. Store report in `bd_weekly_reports` table
6. Send email notifications
7. Create action items in tasks system

**Function Structure**:

```typescript
// supabase/functions/bd-manager-agent/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // 2. Parse request
    const { weekStartDate, forceRerun, sendEmail, recipients } = await req.json();
    const weekStart = new Date(weekStartDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // 3. Check if report already exists
    const { data: existingReport } = await supabase
      .from('bd_weekly_reports')
      .select('*')
      .eq('week_start_date', weekStart.toISOString().split('T')[0])
      .single();

    if (existingReport && !forceRerun) {
      return new Response(
        JSON.stringify({
          success: true,
          report_id: existingReport.id,
          message: 'Report already exists'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Fetch all tracking data
    const trackingData = await fetchWeeklyTrackingData(supabase, weekStart, weekEnd);

    // 5. Build AI prompt
    const prompt = buildBDManagerPrompt(trackingData);

    // 6. Invoke OpenAI
    const aiResponse = await invokeOpenAI(prompt);

    // 7. Parse and validate response
    const structuredOutput = parseAndValidateResponse(aiResponse);

    // 8. Store report
    const { data: report, error: insertError } = await supabase
      .from('bd_weekly_reports')
      .insert({
        week_start_date: weekStart.toISOString().split('T')[0],
        week_end_date: weekEnd.toISOString().split('T')[0],
        quarter: `Q${Math.floor(weekStart.getMonth() / 3) + 1} ${weekStart.getFullYear()}`,
        summary: structuredOutput.summary,
        wig_agenda: structuredOutput.wig_agenda,
        rep_performance: structuredOutput.rep_performance,
        team_metrics: structuredOutput.team_metrics,
        ai_insights: structuredOutput.coaching_recommendations.map(r => r.recommendation),
        risk_alerts: structuredOutput.risks,
        coaching_recommendations: structuredOutput.coaching_recommendations,
        generated_by: trackingData.agentId,
        report_status: 'published'
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 9. Send email notifications
    if (sendEmail && recipients?.length > 0) {
      await sendReportEmail(supabase, report, recipients);
    }

    // 10. Create action items
    await createActionItems(supabase, report);

    return new Response(
      JSON.stringify({
        success: true,
        report_id: report.id,
        summary: structuredOutput.summary
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('BD Manager Agent Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Helper: Fetch all tracking data
async function fetchWeeklyTrackingData(supabase, weekStart, weekEnd) {
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  // Fetch BD reps
  const { data: bdReps } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', (
      await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'team_member')
    ).data.map(r => r.user_id));

  // Fetch quarterly goals
  const { data: quarterlyGoals } = await supabase
    .from('bd_quarterly_goals')
    .select('*')
    .gte('quarter', `Q${Math.floor(weekStart.getMonth() / 3) + 1} ${weekStart.getFullYear()}`);

  // Fetch Upwork activities from Google Sheets
  const upworkActivities = await fetchUpworkDataFromSheets(weekStart, weekEnd);

  // Fetch EOD logs
  const { data: eodLogs } = await supabase
    .from('bd_eod_logs')
    .select('*')
    .gte('eod_date', weekStartStr)
    .lte('eod_date', weekEndStr);

  // Fetch DHS logs
  const { data: dhsLogs } = await supabase
    .from('bd_dhs_logs')
    .select('*')
    .gte('dhs_date', weekStartStr)
    .lte('dhs_date', weekEndStr);

  // Fetch agent config
  const { data: agent } = await supabase
    .from('ai_agents')
    .select('id, config')
    .eq('slug', 'bd-manager-weekly-review')
    .single();

  return {
    weekStart,
    weekEnd,
    bdReps,
    quarterlyGoals,
    upworkActivities,
    eodLogs,
    dhsLogs,
    agentId: agent.id,
    config: agent.config
  };
}

// Helper: Build AI prompt with data
function buildBDManagerPrompt(data) {
  // Structure quarterly goals summary
  const goalsBy Rep = data.quarterlyGoals.reduce((acc, goal) => {
    const repId = goal.assigned_to || 'team';
    if (!acc[repId]) acc[repId] = [];
    acc[repId].push(goal);
    return acc;
  }, {});

  const goalsSummary = Object.entries(goalsByRep).map(([repId, goals]) => {
    const rep = data.bdReps.find(r => r.id === repId) || { full_name: 'Team' };
    return `${rep.full_name}:\n${goals.map(g =>
      `  - ${g.title}: ${g.current_value}/${g.target_value} ${g.unit} (${g.progress_percentage}% - ${g.status})`
    ).join('\n')}`;
  }).join('\n\n');

  // Structure Upwork summary
  const upworkByRep = data.upworkActivities.reduce((acc, activity) => {
    if (!acc[activity.bd_rep_id]) {
      acc[activity.bd_rep_id] = {
        proposals: 0,
        invites: 0,
        interviews: 0,
        wins: 0,
        losses: 0,
        estimated_value: 0
      };
    }
    acc[activity.bd_rep_id].proposals += activity.proposals_sent;
    acc[activity.bd_rep_id].invites += activity.invites_received;
    acc[activity.bd_rep_id].interviews += activity.interviews_booked;
    acc[activity.bd_rep_id].wins += activity.wins;
    acc[activity.bd_rep_id].losses += activity.losses;
    acc[activity.bd_rep_id].estimated_value += activity.estimated_value;
    return acc;
  }, {});

  const upworkSummary = Object.entries(upworkByRep).map(([repId, metrics]) => {
    const rep = data.bdReps.find(r => r.id === repId);
    return `${rep.full_name}: ${metrics.proposals} proposals, ${metrics.invites} invites, ${metrics.interviews} interviews, ${metrics.wins} wins, $${metrics.estimated_value} estimated value`;
  }).join('\n');

  // Structure EOD summary
  const eodByRep = data.eodLogs.reduce((acc, log) => {
    if (!acc[log.bd_rep_id]) acc[log.bd_rep_id] = [];
    acc[log.bd_rep_id].push(log);
    return acc;
  }, {});

  const eodSummary = data.bdReps.map(rep => {
    const logs = eodByRep[rep.id] || [];
    const expectedLogs = 5; // 5 working days
    const completionRate = (logs.length / expectedLogs * 100).toFixed(0);
    const lateLogs = logs.filter(l => l.is_late).length;
    return `${rep.full_name}: ${logs.length}/${expectedLogs} EODs (${completionRate}%), ${lateLogs} late`;
  }).join('\n');

  // Structure DHS summary
  const dhsByRep = data.dhsLogs.reduce((acc, log) => {
    if (!acc[log.bd_rep_id]) acc[log.bd_rep_id] = [];
    acc[log.bd_rep_id].push(log);
    return acc;
  }, {});

  const dhsSummary = data.bdReps.map(rep => {
    const logs = dhsByRep[rep.id] || [];
    const avgScore = logs.reduce((sum, l) => sum + l.health_score, 0) / logs.length || 0;
    const trend = calculateTrend(logs.map(l => l.health_score));
    return `${rep.full_name}: Avg ${avgScore.toFixed(0)}/100 (${trend})`;
  }).join('\n');

  // Get agent prompt template
  const { data: agent } = await supabase
    .from('ai_agents')
    .select('prompt_template, config')
    .eq('slug', 'bd-manager-weekly-review')
    .single();

  // Replace placeholders
  const prompt = agent.prompt_template
    .replace('{{week_start_date}}', data.weekStart.toISOString().split('T')[0])
    .replace('{{week_end_date}}', data.weekEnd.toISOString().split('T')[0])
    .replace('{{quarter}}', Math.floor(data.weekStart.getMonth() / 3) + 1)
    .replace('{{year}}', data.weekStart.getFullYear())
    .replace('{{quarterly_goals_summary}}', goalsSummary)
    .replace('{{upwork_summary}}', upworkSummary)
    .replace('{{eod_summary}}', eodSummary)
    .replace('{{dhs_summary}}', dhsSummary)
    .replace('{{team_target_proposals}}', agent.config.targets?.proposals || 50)
    .replace('{{team_target_wins}}', agent.config.targets?.wins || 10);

  return prompt;
}

// Helper: Calculate trend
function calculateTrend(values) {
  if (values.length < 2) return 'stable';
  const recent = values.slice(-3);
  const earlier = values.slice(0, -3);
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;

  if (recentAvg > earlierAvg * 1.1) return 'improving ↑';
  if (recentAvg < earlierAvg * 0.9) return 'declining ↓';
  return 'stable →';
}

// Helper: Invoke OpenAI
async function invokeOpenAI(prompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a BD performance analysis expert. Provide structured, actionable insights.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })
  });

  const result = await response.json();
  return result.choices[0].message.content;
}

// Helper: Parse and validate response
function parseAndValidateResponse(aiResponse) {
  const parsed = JSON.parse(aiResponse);

  // Validate required fields
  const required = ['summary', 'rep_performance', 'team_metrics', 'risks', 'coaching_recommendations', 'wig_agenda'];
  for (const field of required) {
    if (!parsed[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  return parsed;
}

// Helper: Send report email
async function sendReportEmail(supabase, report, recipients) {
  // Implementation using SendGrid or Supabase email
  // Email template with report summary and link to full report
}

// Helper: Create action items
async function createActionItems(supabase, report) {
  const actionItems = report.wig_agenda.action_items || [];

  for (const item of actionItems) {
    await supabase.from('tasks').insert({
      title: item.title || item,
      description: item.description || '',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
      priority: item.priority || 'medium',
      assigned_to: item.assigned_to,
      created_from: 'bd_manager_agent'
    });
  }
}
```

---

### Upwork Data Fetch Function

**Function**: `fetch-upwork-data`
**Location**: `supabase/functions/fetch-upwork-data/index.ts`

**Purpose**: Fetch Upwork activity data from Google Sheets for display in UI

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { fetchUpworkDataFromSheets, aggregateUpworkByRep } from '../_shared/fetchUpworkDataFromSheets.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // 2. Parse request
    const { weekStartDate, repId } = await req.json();
    const weekStart = new Date(weekStartDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // 3. Fetch data from Google Sheets
    const upworkData = await fetchUpworkDataFromSheets(weekStart, weekEnd);

    // 4. Filter by rep if specified
    let filteredData = upworkData;
    if (repId) {
      // Get rep name from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', repId)
        .single();

      if (profile) {
        filteredData = upworkData.filter(row => row.bdRepName === profile.full_name);
      }
    }

    // 5. Aggregate data
    const aggregated = aggregateUpworkByRep(filteredData);

    // 6. Cache in metadata table
    await supabase.from('bd_upwork_sync_metadata').insert({
      last_sync_at: new Date().toISOString(),
      sync_status: 'success',
      rows_synced: upworkData.length,
      cached_data: aggregated
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: aggregated,
        rawData: filteredData,
        lastSync: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Fetch Upwork Data Error:', error);

    // Log failure
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    await supabase.from('bd_upwork_sync_metadata').insert({
      last_sync_at: new Date().toISOString(),
      sync_status: 'failed',
      error_message: error.message
    });

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
```

---

### Scheduled Execution Function

**Function**: `scheduled-bd-manager-agent`
**Location**: `supabase/functions/scheduled-bd-manager-agent/index.ts`

**Purpose**: Cron job to trigger BD Manager Agent every Monday at 9 AM

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // Use service role for scheduled tasks
    );

    // Get last Monday
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 1
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - diff - 7); // Previous week Monday

    // Get agent config
    const { data: agent } = await supabase
      .from('ai_agents')
      .select('id, schedule_config')
      .eq('slug', 'bd-manager-weekly-review')
      .single();

    if (!agent?.schedule_config?.enabled) {
      console.log('BD Manager Agent scheduling is disabled');
      return new Response('Scheduling disabled', { status: 200 });
    }

    // Invoke bd-manager-agent function
    const { data, error } = await supabase.functions.invoke('bd-manager-agent', {
      body: {
        weekStartDate: lastMonday.toISOString().split('T')[0],
        forceRerun: false,
        sendEmail: true,
        recipients: agent.schedule_config.email_recipients || []
      }
    });

    if (error) throw error;

    console.log('BD Manager Agent executed successfully:', data);

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Scheduled BD Manager Agent Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

**Supabase Cron Configuration** (in Supabase Dashboard):
```
Schedule: 0 9 * * 1 (Every Monday at 9 AM)
Function: scheduled-bd-manager-agent
Region: us-east-1
```

---

## Integration Points

### 1. Navigation Menu Updates

**File**: `src/components/layout/Navigation.tsx`

Add new menu items:

```typescript
// For BD Reps
{
  name: 'My Performance',
  path: '/bd/performance',
  icon: TrendingUpIcon,
  requiredRole: 'team_member'
},

// For Managers
{
  name: 'BD Team Dashboard',
  path: '/admin/bd-dashboard',
  icon: DashboardIcon,
  requiredRole: 'manager'
},
```

---

### 2. Hooks

#### Hook: `useBDQuarterlyGoals.tsx`
**Location**: `src/hooks/useBDQuarterlyGoals.tsx`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useBDQuarterlyGoals(repId?: string) {
  return useQuery({
    queryKey: ['bd-quarterly-goals', repId],
    queryFn: async () => {
      let query = supabase.from('bd_quarterly_goals').select('*');
      if (repId) {
        query = query.eq('assigned_to', repId);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });
}

export function useCreateQuarterlyGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (goalData) => {
      const { data, error } = await supabase
        .from('bd_quarterly_goals')
        .insert(goalData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bd-quarterly-goals'] });
    }
  });
}

export function useUpdateQuarterlyGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const { data, error } = await supabase
        .from('bd_quarterly_goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bd-quarterly-goals'] });
    }
  });
}
```

#### Hook: `useBDUpworkActivities.tsx`
**Location**: `src/hooks/useBDUpworkActivities.tsx`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useBDUpworkActivities(weekStartDate: Date, repId?: string) {
  return useQuery({
    queryKey: ['bd-upwork-activities', weekStartDate.toISOString(), repId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-upwork-data', {
        body: {
          weekStartDate: weekStartDate.toISOString(),
          repId
        }
      });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchInterval: 30 * 60 * 1000 // Auto-refresh every 30 minutes
  });
}

export function useRefreshUpworkData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ weekStartDate, repId }: { weekStartDate: Date; repId?: string }) => {
      // Invalidate cache to force fresh fetch
      await queryClient.invalidateQueries({ queryKey: ['bd-upwork-activities'] });

      const { data, error } = await supabase.functions.invoke('fetch-upwork-data', {
        body: {
          weekStartDate: weekStartDate.toISOString(),
          repId
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Upwork data refreshed successfully" });
    }
  });
}
```

#### Hook: `useBDEODLogs.tsx`
#### Hook: `useBDDHSLogs.tsx`
#### Hook: `useBDWeeklyReports.tsx`

(Similar pattern to `useBDQuarterlyGoals`)

---

### 3. API Layer

**File**: `src/Api/bdPerformance.ts`

```typescript
import { supabase } from '@/integrations/supabase/client';

export async function submitEOD(eodData) {
  const { data, error } = await supabase
    .from('bd_eod_logs')
    .insert(eodData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function submitDHS(dhsData) {
  const { data, error } = await supabase
    .from('bd_dhs_logs')
    .insert(dhsData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchUpworkActivities(weekStartDate: Date, repId?: string) {
  // Fetch Upwork data from Google Sheets via Edge Function
  const { data, error } = await supabase.functions.invoke('fetch-upwork-data', {
    body: {
      weekStartDate: weekStartDate.toISOString(),
      repId
    }
  });

  if (error) throw error;
  return data;
}

export async function triggerBDManagerAgent(payload) {
  const { data, error } = await supabase.functions.invoke('bd-manager-agent', {
    body: payload
  });

  if (error) throw error;
  return data;
}

export async function fetchWeeklyReport(weekStartDate) {
  const { data, error } = await supabase
    .from('bd_weekly_reports')
    .select('*')
    .eq('week_start_date', weekStartDate)
    .single();

  if (error) throw error;
  return data;
}
```

---

### 4. Notifications Integration

Send notifications when:
- EOD is missing (daily reminder at 5 PM)
- DHS not submitted (daily reminder at 6 PM)
- Weekly report generated (Monday morning)
- Rep status changes to "At Risk"

**Implementation**: Use existing `user_notifications` table and `NotificationCenter` component.

---

### 5. Tasks Integration

Auto-create tasks from weekly report action items:

```typescript
// In bd-manager-agent function
await supabase.from('tasks').insert({
  title: actionItem.title,
  description: actionItem.description,
  assigned_to: actionItem.assigned_to,
  due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  priority: actionItem.priority,
  created_from: 'bd_manager_agent'
});
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Goal**: Set up database schema, Google Sheets integration, and basic UI

**Tasks**:
1. ✅ Set up Google Sheets API access
   - Create Google Cloud project
   - Enable Google Sheets API v4
   - Create Service Account
   - Share Google Sheet with service account
   - Store credentials in Supabase Vault
2. ✅ Create database migration for tracking tables (quarterly goals, EOD, DHS, reports, upwork metadata)
3. ✅ Set up RLS policies
4. ✅ Generate TypeScript types (`supabase gen types`)
5. ✅ Create `fetchUpworkDataFromSheets.ts` helper function
6. ✅ Create `fetch-upwork-data` Edge Function
7. ✅ Create basic hooks (`useBDQuarterlyGoals`, `useBDUpworkActivities`, etc.)
8. ✅ Create API layer functions (`src/Api/bdPerformance.ts`)
9. ✅ Set up routing for new pages
10. ✅ Create basic page shells (`BDRepDashboard.tsx`, `BDManagerDashboard.tsx`)

**Deliverables**:
- Google Sheets API integration working
- Database schema deployed
- Basic page structure in place
- Hooks and API functions ready

---

### Phase 2: Data Entry UI (Week 3-4)
**Goal**: Build UI for BD reps to input daily/weekly data

**Tasks**:
1. ✅ Build `EODSubmissionForm.tsx` component
2. ✅ Build `DHSTracker.tsx` component
3. ✅ Build `UpworkActivityViewer.tsx` component (read-only, displays Google Sheets data)
4. ✅ Build `QuarterlyGoalsManager.tsx` component
5. ✅ Integrate forms into `BDRepDashboard.tsx`
6. ✅ Add form validation (React Hook Form + Zod)
7. ✅ Add toast notifications for submissions
8. ✅ Add Google Sheets link for Upwork data entry
9. ✅ Test data entry flows

**Deliverables**:
- Fully functional BD rep dashboard
- EOD and DHS forms working
- Upwork data displaying from Google Sheets
- Quarterly goals management working
- Data being saved to database

---

### Phase 3: AI Agent Development (Week 5-6)
**Goal**: Build BD Manager Agent and report generation

**Tasks**:
1. ✅ Create `bd-manager-agent` Edge Function
2. ✅ Implement data aggregation logic
3. ✅ Build AI prompt template
4. ✅ Integrate OpenAI API
5. ✅ Implement response parsing and validation
6. ✅ Store reports in `bd_weekly_reports` table
7. ✅ Create agent record in `ai_agents` table
8. ✅ Build `BDManagerAgentRunner.tsx` component
9. ✅ Test agent execution manually

**Deliverables**:
- Working BD Manager Agent
- Manual execution via UI
- Reports stored in database

---

### Phase 4: Manager Dashboard & Visualization (Week 7)
**Goal**: Build manager dashboard with charts and insights

**Tasks**:
1. ✅ Build `BDManagerDashboard.tsx` page
2. ✅ Build `WeeklyReportViewer.tsx` component
3. ✅ Build `BDPerformanceCharts.tsx` component
4. ✅ Implement chart library (Recharts)
5. ✅ Add drill-down functionality
6. ✅ Add PDF export for reports
7. ✅ Add WIG agenda view
8. ✅ Test manager workflows

**Deliverables**:
- Fully functional manager dashboard
- Interactive charts and reports
- PDF export working

---

### Phase 5: Automation & Scheduling (Week 8)
**Goal**: Set up automated weekly report generation

**Tasks**:
1. ✅ Create `scheduled-bd-manager-agent` Edge Function
2. ✅ Configure Supabase cron job (Monday 9 AM)
3. ✅ Implement email notification system
4. ✅ Test scheduled execution
5. ✅ Add notification reminders (EOD/DHS missing)
6. ✅ Integrate with tasks system
7. ✅ Add configuration UI for scheduling

**Deliverables**:
- Automated weekly reports every Monday
- Email notifications working
- Reminder system active

---

### Phase 6: Testing & Polish (Week 9)
**Goal**: Comprehensive testing and refinement

**Tasks**:
1. ✅ Write unit tests for hooks
2. ✅ Write integration tests for Edge Functions
3. ✅ Test all user flows (rep and manager)
4. ✅ Performance optimization
5. ✅ UI/UX polish
6. ✅ Error handling improvements
7. ✅ Documentation updates
8. ✅ Training materials for users

**Deliverables**:
- All tests passing
- Production-ready system
- User documentation

---

## Testing Strategy

### 1. Unit Tests

**Hooks Tests** (`tests/bdPerformance/`):
```typescript
// tests/bdPerformance/useBDQuarterlyGoals.test.tsx
import { describe, it, expect } from 'bun:test';
import { renderHook } from '@testing-library/react';
import { useBDQuarterlyGoals } from '@/hooks/useBDQuarterlyGoals';

describe('useBDQuarterlyGoals', () => {
  it('fetches quarterly goals for a rep', async () => {
    const { result } = renderHook(() => useBDQuarterlyGoals('rep-id'));
    // Assertions...
  });
});
```

**Component Tests**:
```typescript
// tests/bdPerformance/EODSubmissionForm.test.tsx
import { describe, it, expect } from 'bun:test';
import { render, fireEvent } from '@testing-library/react';
import EODSubmissionForm from '@/components/bd/tracking/EODSubmissionForm';

describe('EODSubmissionForm', () => {
  it('validates required fields', async () => {
    const { getByText, getByLabelText } = render(<EODSubmissionForm />);
    fireEvent.submit(getByText('Submit'));
    expect(getByText('This field is required')).toBeDefined();
  });
});
```

---

### 2. Integration Tests

**Edge Function Tests**:
```typescript
// tests/bdPerformance/bdManagerAgent.test.ts
import { describe, it, expect } from 'bun:test';

describe('BD Manager Agent Edge Function', () => {
  it('generates weekly report with valid data', async () => {
    const response = await fetch('http://localhost:54321/functions/v1/bd-manager-agent', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        weekStartDate: '2026-01-13',
        forceRerun: false,
        sendEmail: false
      })
    });

    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.report_id).toBeDefined();
  });
});
```

---

### 3. End-to-End Tests

**User Flow Tests**:
1. BD Rep logs in → Submits EOD → Sees success message
2. BD Rep submits DHS → Score calculates correctly
3. BD Rep logs Upwork activity → Data appears in weekly summary
4. Manager views weekly report → All data displays correctly
5. Scheduled agent runs → Report generated and emailed

---

### 4. Performance Tests

**Metrics to track**:
- Page load time for BD Rep Dashboard (< 2 seconds)
- Agent execution time (< 30 seconds for full week analysis)
- Database query performance (< 500ms for data aggregation)
- Report generation time (< 15 seconds)

---

## Deployment Plan

### 1. Pre-Deployment Checklist

- [ ] All database migrations tested in staging
- [ ] RLS policies verified
- [ ] Edge Functions deployed to staging
- [ ] Cron job configured
- [ ] Environment variables set
- [ ] Email templates configured
- [ ] Notification system tested
- [ ] User documentation prepared
- [ ] Training session scheduled

---

### 2. Deployment Steps

```bash
# 1. Deploy database migrations
supabase db push

# 2. Regenerate types
supabase gen types typescript --local > src/integrations/supabase/types.ts

# 3. Deploy Edge Functions
supabase functions deploy bd-manager-agent
supabase functions deploy scheduled-bd-manager-agent

# 4. Configure cron job (Supabase Dashboard)
# Go to Edge Functions > scheduled-bd-manager-agent > Cron
# Set: 0 9 * * 1 (Every Monday at 9 AM)

# 5. Insert agent record (run SQL in Supabase SQL Editor)
# Use SQL from "AI Agent Configuration" section above

# 6. Deploy frontend
npm run build
# Deploy to production hosting

# 7. Verify deployment
# - Test BD Rep dashboard
# - Test Manager dashboard
# - Manually trigger agent
# - Verify email notifications
```

---

### 3. Post-Deployment Monitoring

**Week 1 After Launch**:
- Monitor agent execution logs daily
- Check EOD/DHS submission rates
- Gather user feedback
- Fix any critical bugs

**Week 2-4**:
- Analyze usage patterns
- Optimize slow queries
- Refine AI prompts based on report quality
- Add requested features

**Ongoing**:
- Weekly review of agent performance
- Monthly system health check
- Quarterly feature enhancements

---

## Success Metrics

### Key Performance Indicators (KPIs)

1. **EOD Completion Rate**: Target 95%+ (currently measuring)
2. **DHS Submission Rate**: Target 90%+ (currently measuring)
3. **Manager Time Savings**: Target 80% reduction in manual reporting
4. **Report Generation Success Rate**: Target 99%+
5. **Agent Execution Time**: Target < 30 seconds
6. **User Satisfaction**: Target 4.5/5 stars

---

## Future Enhancements (Post-MVP)

1. **Predictive Analytics**: AI predictions for deal close probability based on activity patterns
2. **Peer Benchmarking**: Compare rep performance anonymously
3. **Mobile App**: iOS/Android app for EOD/DHS submission
4. **Slack Integration**: Submit EOD via Slack bot
5. **Gamification**: Leaderboards, badges, streaks for consistent submissions
6. **Advanced Coaching**: AI-generated personalized coaching plans
7. **Video Analysis**: Record and analyze sales calls
8. **CRM Integration**: Auto-populate from Salesforce/HubSpot
9. **Voice EOD**: Submit EOD via voice note (transcribed)
10. **Team Retrospectives**: Automated sprint retrospective reports

---

## Risks & Mitigation

### Risk 1: Low Adoption by BD Reps
**Mitigation**:
- Make submission fast (< 2 minutes)
- Gamify with streaks and badges
- Tie to performance reviews
- Provide immediate value (personal insights)

### Risk 2: AI Report Quality Issues
**Mitigation**:
- Iterative prompt refinement
- Human review for first 4 weeks
- Feedback mechanism in UI
- Fallback to template if AI fails

### Risk 3: Data Privacy Concerns
**Mitigation**:
- Clear RLS policies
- Audit logs
- Anonymize data in team views
- Transparent privacy policy

### Risk 4: Scheduler Reliability
**Mitigation**:
- Redundant cron jobs
- Manual trigger option
- Failure alerts to admin
- Weekly health check

---

## Appendix

### A. Database ERD

```
bd_quarterly_goals
├── id (PK)
├── assigned_to (FK → profiles)
├── created_by (FK → profiles)
└── ... (other fields)

bd_quarterly_activities
├── id (PK)
├── goal_id (FK → bd_quarterly_goals)
└── ... (other fields)

bd_upwork_activities
├── id (PK)
├── bd_rep_id (FK → profiles)
└── ... (other fields)

bd_eod_logs
├── id (PK)
├── bd_rep_id (FK → profiles)
└── ... (other fields)

bd_dhs_logs
├── id (PK)
├── bd_rep_id (FK → profiles)
└── ... (other fields)

bd_weekly_reports
├── id (PK)
├── generated_by (FK → ai_agents)
└── ... (other fields)
```

---

### B. API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/bd/quarterly-goals` | GET | Fetch goals |
| `/bd/quarterly-goals` | POST | Create goal |
| `/bd/quarterly-goals/:id` | PATCH | Update goal |
| `/bd/upwork-activities` | GET | Fetch activities |
| `/bd/upwork-activities` | POST | Log activity |
| `/bd/eod-logs` | GET | Fetch EOD logs |
| `/bd/eod-logs` | POST | Submit EOD |
| `/bd/dhs-logs` | GET | Fetch DHS logs |
| `/bd/dhs-logs` | POST | Submit DHS |
| `/bd/weekly-reports` | GET | Fetch reports |
| `/bd/weekly-reports/:week` | GET | Fetch specific report |
| `/functions/v1/bd-manager-agent` | POST | Trigger agent |

---

### C. File Structure Checklist

```
src/
├── pages/
│   ├── bd/
│   │   └── BDRepDashboard.tsx ✅
│   └── admin/
│       └── BDManagerDashboard.tsx ✅
├── components/
│   └── bd/
│       ├── tracking/
│       │   ├── EODSubmissionForm.tsx ✅
│       │   ├── DHSTracker.tsx ✅
│       │   ├── UpworkActivityViewer.tsx ✅ (read-only, displays Google Sheets data)
│       │   └── QuarterlyGoalsManager.tsx ✅
│       └── reports/
│           ├── WeeklyReportViewer.tsx ✅
│           └── BDPerformanceCharts.tsx ✅
├── features/
│   └── ai/
│       └── agents/
│           └── BDManagerAgentRunner.tsx ✅
├── hooks/
│   ├── useBDQuarterlyGoals.tsx ✅
│   ├── useBDUpworkActivities.tsx ✅
│   ├── useBDEODLogs.tsx ✅
│   ├── useBDDHSLogs.tsx ✅
│   └── useBDWeeklyReports.tsx ✅
├── Api/
│   └── bdPerformance.ts ✅
└── types/
    └── bdPerformance.ts ✅

supabase/
├── functions/
│   ├── _shared/
│   │   └── fetchUpworkDataFromSheets.ts ✅ (Google Sheets API helper)
│   ├── bd-manager-agent/ ✅
│   │   └── index.ts
│   ├── fetch-upwork-data/ ✅
│   │   └── index.ts
│   └── scheduled-bd-manager-agent/ ✅
│       └── index.ts
└── migrations/
    └── 20260120000000_create_bd_performance_tables.sql ✅

tests/
└── bdPerformance/
    ├── useBDQuarterlyGoals.test.tsx ✅
    ├── EODSubmissionForm.test.tsx ✅
    └── bdManagerAgent.test.ts ✅
```

---

### D. Environment Variables

```bash
# .env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
SENDGRID_API_KEY=your_sendgrid_api_key

# Google Sheets Integration
GOOGLE_SHEETS_SERVICE_ACCOUNT={"type":"service_account",...}
GOOGLE_SHEET_ID=1vEpdB36TWmNro3wYCYq62k-khLXhdmWnonabkBT-P1Q
GOOGLE_SHEET_UPWORK_TAB_NAME=Sheet1
VITE_UPWORK_SHEET_URL=https://docs.google.com/spreadsheets/d/1vEpdB36TWmNro3wYCYq62k-khLXhdmWnonabkBT-P1Q/edit?gid=513030245#gid=513030245
```

---

### E. Git Workflow

```bash
# Create feature branch
git checkout -b claude/bd-manager-agent-implementation

# Commit by phase
git commit -m "feat(bd-manager): Phase 1 - Database schema"
git commit -m "feat(bd-manager): Phase 2 - Data entry UI"
git commit -m "feat(bd-manager): Phase 3 - AI agent"
git commit -m "feat(bd-manager): Phase 4 - Manager dashboard"
git commit -m "feat(bd-manager): Phase 5 - Automation"
git commit -m "feat(bd-manager): Phase 6 - Testing & polish"

# Push to remote
git push -u origin claude/bd-manager-agent-implementation

# Create PR
gh pr create --title "feat: BD Manager Agent System" --body "$(cat <<'EOF'
## Summary
- Quarterly Accountability Chart & Activities tracking
- Upwork Tracker for BD activities
- EOD Tracker for daily discipline
- DHS Tracker for daily health signals
- BD Manager Agent for weekly reports and WIG agendas

## Test Plan
- [x] Database migrations
- [x] BD Rep dashboard
- [x] Manager dashboard
- [x] AI agent execution
- [x] Scheduled reports
- [x] Email notifications
- [x] Unit tests
- [x] Integration tests
EOF
)"
```

---

**End of Implementation Plan**

---

## Quick Start Guide for Developers

### To start implementing this plan:

1. **Review the plan** - Understand the full scope
2. **Set up database** - Run migration in Phase 1
3. **Create hooks** - Build data access layer
4. **Build UI** - Start with BD Rep dashboard
5. **Develop agent** - Implement Edge Functions
6. **Test thoroughly** - Don't skip testing
7. **Deploy incrementally** - Phase by phase

### Estimated Timeline: 8-9 weeks
### Team Size: 1-2 developers
### Complexity: High (Full-stack + AI integration)

**Good luck! 🚀**

# Accountability Chart - Admin & Configuration Guide

**Last Updated**: February 12, 2026
**Module**: Business Development → Accountability Chart
**Audience**: Administrators, Super Admins, Engineering

---

## Table of Contents

1. [Admin Dashboard Overview](#admin-dashboard-overview)
2. [Quarter Management](#quarter-management)
3. [Team Goal Management](#team-goal-management)
4. [Goal Approval Management](#goal-approval-management)
5. [Data Auditing & Analytics](#data-auditing--analytics)
6. [Configuration & Settings](#configuration--settings)
7. [Troubleshooting](#troubleshooting)
8. [Database Schema Reference](#database-schema-reference)

---

## Admin Dashboard Overview

### Access
- **URL**: `/bd/accountability`
- **Required Role**: `manager`, `admin`, or `super_admin`
- **Tabs Available**:
  1. **Quarters** - Quarter management and configuration
  2. **Team Goals** - Organization-wide goal management
  3. **Team Progress** - Visual dashboard of all rep goals linked to team goals
  4. **Approvals** - Pending rep goal approvals requiring action
  5. **My Goals** - Admin's own rep goals (if applicable)

### Dashboard Sections

#### Quarter Management Section
- **Dropdown Selector**: Choose active quarter
- **Create Quarter Button**: Create new quarterly period
- **Quarter Status**: Shows current quarter's status (planning/active/completed/archived)

#### Team Goals Section
- **List View**: All team goals for selected quarter
- **Columns**: Title, Target (value + unit), Current Progress, Status, Created By
- **Status Colors**:
  - Green (On Track)
  - Yellow (At Risk)
  - Red (Off Track)
  - Blue (Completed)
- **Actions**: Edit, Delete, View Details

#### Team Progress Dashboard
- **Visual Overview**: All rep goals linked to team goals
- **Filters**: By team goal, by rep, by status, by quarter
- **Metrics Displayed**:
  - Total rep goals
  - By status: On Track, At Risk, Off Track, Completed
  - Average progress %
  - Projected completion rate
- **Drill-Down**: Click any goal to see details, activities, weekly updates

#### Approvals Queue
- **Pending Goals**: List of rep goals awaiting manager approval
- **Shows**: Rep name, goal title, target, submission date
- **Actions**: Approve with confirmation, Reject with reason modal

---

## Quarter Management

### Creating a New Quarter

#### Step 1: Click "New Quarter"
```
Business Development → Accountability Chart
  → Quarter Selector dropdown
  → "New Quarter" button
```

#### Step 2: Fill Form
```
Field: Quarter Name
Value: "Q1 2026" or "2026 H1 Planning"
Note: Name should be unique and descriptive

Field: Start Date
Value: First day of quarter (e.g., 2026-01-01)

Field: End Date
Value: Last day of quarter (e.g., 2026-03-31)
Validation: End date must be after start date
```

#### Step 3: Submit
- Click "Create Quarter"
- New quarter now appears in dropdown
- Initial status: **Planning**

### Quarter Status Transitions

```
┌──────────────┐
│   Planning   │  (setup phase, managers create team goals)
│              │
└──────────────┘
       ↓ (starts)
┌──────────────┐
│    Active    │  (reps submit weekly updates, progress tracked)
│              │
└──────────────┘
       ↓ (ends)
┌──────────────┐
│  Completed   │  (finalized, can transition to archived)
│              │
└──────────────┘
       ↓ (archive)
┌──────────────┐
│   Archived   │  (historical reference, read-only)
│              │
└──────────────┘
```

### Changing Quarter Status

1. Click on quarter in dropdown
2. Click "Edit Quarter" button
3. Change status dropdown
4. Click "Update Quarter"

**Implications**:
- **Planning → Active**: Reps can now submit weekly updates
- **Active → Completed**: Quarter is finalized, should prepare next quarter
- **Completed → Archived**: Quarter moves to historical archive
- **Archived → (Completed, Active, Planning)**: Rarely used; for data corrections only

### Editing Quarter

- Click "Edit Quarter" button
- Modify name, start date, end date
- Note: Changing dates does NOT retroactively recalculate goal status
- Click "Update Quarter"

### Deleting Quarter

⚠️ **Warning**: Deleting a quarter deletes all goals, activities, and weekly updates for that quarter. This action is **permanent and cannot be undone**.

1. Click "Delete Quarter" button
2. Confirm deletion dialog
3. All associated data is removed

**Best Practice**: Archive instead of deleting for historical record-keeping.

---

## Team Goal Management

### Creating Team Goals

#### Step 1: Ensure Active Quarter
- Select desired quarter from dropdown (or confirm current quarter is selected)

#### Step 2: Click "New Team Goal"
- Navigates to Team Goals tab
- Click "New Team Goal" button

#### Step 3: Fill Form
```
Field: Title
Example: "Increase Sales Conversion Rate"
Guidance: Clear, measurable outcome

Field: Description (optional)
Example: "Drive more qualified leads through the pipeline to close more deals"
Guidance: Context for the team, why this goal matters

Field: Target Value
Example: "25"
Guidance: Numeric target

Field: Target Unit
Example: "deals" or "meetings" or "proposals"
Guidance: Unit of measurement

Field: Link to Existing Team Goal (optional)
Note: Not used for team goals (used for rep goals linking to team goals)
```

#### Step 4: Submit
- Click "Create Team Goal"
- Team goal is created with status **On Track** (100% of 0% = on track)
- Display on Team Goals tab

### Editing Team Goals

1. Click "Edit" button on team goal card
2. Modify:
   - Title
   - Description
   - Target value or unit
3. **Note**: Current value is auto-calculated from linked rep goals; cannot be manually edited
4. Click "Update Team Goal"

### Monitoring Team Goal Progress

#### Automatic Progress Calculation

The system automatically aggregates progress from all linked rep goals:

```
All rep goals linked to team goal
  ├─ Rep 1: 2/4 deals = 50%
  ├─ Rep 2: 1/3 deals = 33%
  ├─ Rep 3: 3/5 deals = 60%
  └─ Rep 4: 2/3 deals = 67%
       ↓ [SUM current values]
Team Goal Current Value: 8/15 = 53%
```

#### Status Auto-Calculation

Status is calculated based on progress ratio vs. time elapsed:

```
Q1 2026: Jan 1 - Mar 31 (90 days)
Today: Feb 15 (46 days elapsed = 51% of quarter)

Team Goal: 25 deals
Current: 13 deals (52% progress)

Progress Ratio: 52%
Time Ratio: 51%

Since 52% ≥ 90% of expected (51% × 0.9 = 46%):
Status: ON TRACK ✓
```

### Viewing Team Goal Details

1. Click "View Details" on team goal card
2. Detail page shows:
   - Goal title, description, target
   - Progress chart (visual)
   - Current value vs. target
   - Linked rep goals (expandable list)
   - Aggregated activities from all rep goals
   - Aggregated weekly updates

---

## Goal Approval Management

### Approval Workflow

#### Rep Goal Lifecycle

```
1. Rep creates goal
   └─ Status: DRAFT
   └─ Rep can edit/delete freely
   └─ Rep is only editor

2. Rep submits for approval
   └─ Status: PENDING APPROVAL
   └─ Notification sent to manager
   └─ Rep cannot edit (prevented by RLS)
   └─ Manager receives task in Approvals queue

3a. Manager approves
    └─ Status: APPROVED
    └─ Notification sent to rep
    └─ Rep can now add activities & submit weekly updates
    └─ Moved out of Approvals queue

3b. Manager rejects
    └─ Status: DRAFT (reverted)
    └─ Rejection reason stored in database
    └─ Notification sent to rep with reason
    └─ Rep can edit and resubmit
```

### Managing Approvals Queue

#### Viewing Pending Approvals

1. Navigate to "Approvals" tab
2. Shows all rep goals with status: "Pending Approval"
3. Columns: Rep Name, Goal Title, Target, Submitted Date

#### Approving a Goal

1. Click on goal in Approvals queue
2. Review:
   - Goal title and description
   - Target value and unit
   - Rep name
   - Submission date
3. Click "Approve Goal" button
4. Confirmation dialog
5. Click "Confirm"
   - Goal status: Approved
   - Rep receives notification
   - Goal removed from Approvals queue
   - Rep can now add activities

#### Rejecting a Goal

1. Click on goal in Approvals queue
2. Review goal details
3. Click "Reject Goal" button
4. Modal appears:
   - **Rejection Reason** (text field, required)
   - Example: "Please increase target to 6 deals to align with team goal"
5. Click "Reject"
   - Goal status: Draft (reverted)
   - Rep receives notification with rejection reason
   - Goal removed from Approvals queue
   - Rep can edit and resubmit

#### Batch Approval (if implementing)

**Note**: Current UI supports single approval. For bulk approvals:
- Approve each goal individually, or
- Contact engineering for batch approval feature

---

## Data Auditing & Analytics

### Viewing Goal Metadata

For each goal, view:
- **Created At**: When goal was created
- **Updated At**: Last modification time
- **Created By**: Username (hover for email)
- **Approved By**: Username if approved (only for rep goals)
- **Approval Date**: When approval/rejection occurred

### Tracking Approvals

#### Built-in Audit Trail
All goals store:
- `created_by` (UUID)
- `approval_status` (draft/pending/approved/rejected)
- `approved_by` (UUID, null if not approved)
- `approved_at` (timestamp, null if not approved)
- `rejection_reason` (text, null if not rejected)

#### Generating Reports

**Option 1: Export from Admin Panel**
- Navigate to Team Goals or Rep Goals
- (If export feature available) Click "Export CSV"
- Use in Excel for analysis

**Option 2: Direct Database Query**
- Contact engineering team
- Query `accountability_rep_goals` table with filters:
  - By quarter: `WHERE quarter_id = ?`
  - By rep: `WHERE rep_id = ?`
  - By approval status: `WHERE approval_status = 'approved'`

### Key Metrics to Monitor

| Metric | Calculation | Insight |
|--------|---|---|
| **Goal Approval Rate** | Approved goals / Total goals submitted | Are reps setting realistic goals? |
| **On Track Rate** | On Track goals / Total goals | Team health and performance |
| **Average Days to Approval** | Avg(approved_at - created_at) | Approval speed; need bottleneck? |
| **Rejection Rate** | Rejected goals / Total submitted | Are expectations misaligned? |
| **Weekly Update Submission Rate** | Updates submitted / Expected updates | Engagement level |

---

## Configuration & Settings

### Role-Based Access Control

#### Permissions by Role

```
team_member:
  ✓ View all quarters, team goals, rep goals, activities, updates
  ✓ Create own rep goals (draft)
  ✓ Create own activities on own approved goals
  ✓ Submit own weekly updates
  ✗ Approve/manage other goals
  ✗ Create team goals or quarters

manager:
  ✓ All of team_member permissions
  ✓ Create/edit/delete team goals
  ✓ Create/edit quarters
  ✓ View all rep goals
  ✓ Approve/reject rep goal submissions
  ✓ Edit any rep's goal
  ✓ Create/edit activities on any goal
  ✓ Submit/edit weekly updates for any goal

admin:
  ✓ All of manager permissions
  ✓ Delete quarters (careful!)
  ✓ Delete any goal or activity
  ✓ Full audit trail access

super_admin:
  ✓ All of admin permissions
  ✓ System-level configurations
```

### Customization Options

#### Field Customization

**Currently Hard-coded** (would require code changes):
- Frequency options: Daily, Weekly, Bi-weekly, Monthly, One-time
- Status options: On Track, At Risk, Off Track, Completed
- Approval statuses: Draft, Pending Approval, Approved, Rejected

**To customize**:
- Modify enum definitions in Supabase
- Update form component options in React
- See Database Schema Reference section

#### Notification Settings

**Current Implementation**:
- Goal approval request → Managers
- Goal approval/rejection decision → Rep
- Status change (On Track → At Risk) → Rep

**To modify**:
- Edit trigger functions in database
- Contact engineering team

---

## Troubleshooting

### Issue: Goal Status Not Updating

**Symptoms**: Goal shows "On Track" but progress is low

**Causes**:
1. Weekly updates not submitted for current week
2. Auto-calculation trigger not firing

**Solutions**:
1. Check if weekly updates exist for current week
   - Navigate to goal → Activities → Timeline
   - If no update for current week, submit one
2. Manually trigger progress calculation:
   - Contact engineering team
   - They can run: `SELECT update_goal_progress_from_activities(?)`

### Issue: Rep Cannot Edit Goal After Rejection

**Symptoms**: "Cannot update goal" error when rep tries to edit rejected goal

**Causes**:
- RLS policy only allows edits on Draft or Rejected goals owned by rep
- Possible data integrity issue

**Solutions**:
1. Check goal approval_status in database (should be 'draft' after rejection)
2. If status is incorrect:
   - Manager can edit the goal directly
   - Or contact engineering to manually reset status

### Issue: Approvals Queue Shows Stale Goals

**Symptoms**: Goal in Approvals queue but already approved

**Causes**:
- Page not refreshed after approval
- Cache not invalidated

**Solutions**:
1. Refresh browser (Ctrl+R or Cmd+R)
2. Clear browser cache
3. Try again

### Issue: Manager Cannot See Rep Goals

**Symptoms**: Manager sees "No goals found" on Team Progress tab

**Causes**:
1. Rep hasn't created any goals for selected quarter
2. RLS policy blocking access (unlikely)
3. Wrong quarter selected

**Solutions**:
1. Verify quarter is selected (check dropdown)
2. Ask rep to create a goal
3. Check if quarter is in "Active" status
4. Contact engineering if RLS issue

### Issue: Progress Not Aggregating to Team Goal

**Symptoms**: Rep goal shows 50% progress but team goal doesn't reflect it

**Causes**:
1. Rep goal not linked to team goal
2. Aggregation trigger not fired
3. Rep goal in Draft/Pending status (not counted in aggregation)

**Solutions**:
1. Edit rep goal and explicitly link to team goal
2. Check if rep goal is Approved (only approved goals are aggregated)
3. Manual aggregation: Contact engineering team

---

## Database Schema Reference

### Tables

#### `accountability_quarters`
```sql
Columns:
  id UUID PRIMARY KEY
  name TEXT UNIQUE
  start_date DATE
  end_date DATE
  status quarter_status ('planning'|'active'|'completed'|'archived')
  created_by UUID (FK → auth.users)
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

Indexes:
  idx_accountability_quarters_status
  idx_accountability_quarters_dates

Queries:
  -- Get active quarter
  SELECT * FROM accountability_quarters
  WHERE status = 'active'
  LIMIT 1;

  -- Get all quarters by rep
  SELECT q.* FROM accountability_quarters q
  WHERE q.created_at >= '2025-01-01'
  ORDER BY q.start_date DESC;
```

#### `accountability_team_goals`
```sql
Columns:
  id UUID PRIMARY KEY
  quarter_id UUID (FK → accountability_quarters) CASCADE
  title TEXT
  description TEXT
  target_value NUMERIC (>0)
  target_unit TEXT
  current_value NUMERIC (default 0)
  status goal_status
  created_by UUID (FK → auth.users)
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

Indexes:
  idx_accountability_team_goals_quarter
  idx_accountability_team_goals_status

Queries:
  -- Get all team goals for quarter
  SELECT * FROM accountability_team_goals
  WHERE quarter_id = ?
  ORDER BY created_at DESC;

  -- Get team goals by status
  SELECT * FROM accountability_team_goals
  WHERE status = 'on_track'
  ORDER BY current_value / target_value DESC;
```

#### `accountability_rep_goals`
```sql
Columns:
  id UUID PRIMARY KEY
  quarter_id UUID (FK → accountability_quarters) CASCADE
  team_goal_id UUID (FK → accountability_team_goals) NULLABLE
  rep_id UUID (FK → auth.users) CASCADE
  title TEXT
  description TEXT
  target_value NUMERIC (>0)
  target_unit TEXT
  current_value NUMERIC (default 0)
  status goal_status
  approval_status goal_approval_status
  approved_by UUID (FK → auth.users) NULLABLE
  approved_at TIMESTAMPTZ NULLABLE
  rejection_reason TEXT NULLABLE
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

Constraints:
  UNIQUE(rep_id, quarter_id, title) -- prevent duplicates per rep per quarter

Indexes:
  idx_accountability_rep_goals_quarter
  idx_accountability_rep_goals_rep
  idx_accountability_rep_goals_team_goal
  idx_accountability_rep_goals_approval
  idx_accountability_rep_goals_status

Queries:
  -- Get rep's goals for quarter
  SELECT * FROM accountability_rep_goals
  WHERE rep_id = ? AND quarter_id = ?
  ORDER BY created_at DESC;

  -- Get pending approvals
  SELECT rg.*, p.email, p.full_name
  FROM accountability_rep_goals rg
  JOIN profiles p ON rg.rep_id = p.user_id
  WHERE approval_status = 'pending_approval'
  ORDER BY rg.created_at ASC;

  -- Get approved goals (active for progress tracking)
  SELECT * FROM accountability_rep_goals
  WHERE approval_status = 'approved'
  AND quarter_id = ?;
```

#### `accountability_activities`
```sql
Columns:
  id UUID PRIMARY KEY
  rep_goal_id UUID (FK → accountability_rep_goals) CASCADE
  title TEXT
  description TEXT
  frequency activity_frequency
  target_count INTEGER (>0)
  current_count INTEGER (default 0)
  linked_task_id UUID (FK → project_tasks) NULLABLE
  status activity_status ('active'|'paused'|'completed')
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

Indexes:
  idx_accountability_activities_rep_goal
  idx_accountability_activities_task
  idx_accountability_activities_status

Queries:
  -- Get activities for goal
  SELECT * FROM accountability_activities
  WHERE rep_goal_id = ?
  ORDER BY created_at DESC;

  -- Get active activities
  SELECT * FROM accountability_activities
  WHERE status = 'active'
  AND rep_goal_id = ?;
```

#### `accountability_weekly_updates`
```sql
Columns:
  id UUID PRIMARY KEY
  activity_id UUID (FK → accountability_activities) CASCADE
  week_start_date DATE
  week_end_date DATE
  progress_value NUMERIC (default 0, >=0)
  progress_percentage INTEGER (0-100, default 0)
  status goal_status
  blockers TEXT NULLABLE
  help_needed TEXT NULLABLE
  notes TEXT NULLABLE
  submitted_by UUID (FK → auth.users)
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

Constraints:
  UNIQUE(activity_id, week_start_date) -- one update per activity per week

Indexes:
  idx_accountability_weekly_updates_activity
  idx_accountability_weekly_updates_dates
  idx_accountability_weekly_updates_submitted

Queries:
  -- Get updates for activity
  SELECT * FROM accountability_weekly_updates
  WHERE activity_id = ?
  ORDER BY week_start_date DESC;

  -- Get current week's updates
  SELECT * FROM accountability_weekly_updates
  WHERE activity_id = ?
  AND week_start_date = ?;

  -- Get all updates for rep in quarter
  SELECT wu.* FROM accountability_weekly_updates wu
  JOIN accountability_activities aa ON wu.activity_id = aa.id
  JOIN accountability_rep_goals rg ON aa.rep_goal_id = rg.id
  WHERE rg.rep_id = ? AND rg.quarter_id = ?
  ORDER BY wu.week_start_date DESC;
```

### Database Functions

#### `is_manager_or_admin()`
```sql
-- Returns true if current user is manager, admin, or super_admin
SELECT is_manager_or_admin();
```

#### `update_goal_progress_from_activities(goal_id UUID)`
```sql
-- Aggregates all activity progress to rep goal
-- Then aggregates all rep goals to team goal
-- Called automatically on activity/weekly_update changes
SELECT update_goal_progress_from_activities(?);
```

#### `calculate_goal_status(goal_id UUID, current_value NUMERIC, target_value NUMERIC, quarter_id UUID)`
```sql
-- Calculates goal status based on progress ratio vs. time elapsed
-- Returns: 'on_track' | 'at_risk' | 'off_track' | 'completed'
SELECT calculate_goal_status(?, ?, ?, ?);
```

### RLS Policies

All tables have Row Level Security enabled. Key policies:

```sql
-- accountability_quarters
SELECT: auth.uid() IS NOT NULL (all authenticated users)
INSERT/UPDATE/DELETE: is_manager_or_admin()

-- accountability_team_goals
SELECT: auth.uid() IS NOT NULL
INSERT/UPDATE/DELETE: is_manager_or_admin()

-- accountability_rep_goals
SELECT: auth.uid() IS NOT NULL
INSERT: rep_id = auth.uid() OR is_manager_or_admin()
UPDATE:
  (rep_id = auth.uid() AND approval_status IN ('draft', 'rejected'))
  OR is_manager_or_admin()
DELETE: is_manager_or_admin()

-- accountability_activities
SELECT: auth.uid() IS NOT NULL
INSERT/UPDATE/DELETE:
  rep_goal.rep_id = auth.uid()
  OR is_manager_or_admin()

-- accountability_weekly_updates
SELECT: auth.uid() IS NOT NULL
INSERT: activity.rep_goal.rep_id = auth.uid() OR is_manager_or_admin()
UPDATE: submitted_by = auth.uid() OR is_manager_or_admin()
DELETE: is_manager_or_admin()
```

---

## Advanced Configuration

### Modifying Enum Values

To add new frequency options, goal statuses, or approval statuses:

1. **Update Supabase Enums**:
```sql
-- Example: Add 'semi-monthly' frequency
ALTER TYPE activity_frequency ADD VALUE 'semi_monthly'
AFTER 'biweekly';
```

2. **Update React Components**:
```typescript
// src/components/accountability/ActivityForm.tsx
const frequencyOptions = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'semi_monthly', label: 'Semi-monthly' }, // NEW
  { value: 'monthly', label: 'Monthly' },
  { value: 'one_time', label: 'One-time' },
];
```

3. **Update Types** in `src/integrations/supabase/types.ts`

### Customizing Progress Calculation

To modify how goal status is calculated:

1. Edit database function: `calculate_goal_status()`
2. Currently uses:
   - progress_ratio = current_value / target_value
   - time_ratio = time_elapsed / total_quarter_days
3. Thresholds (adjustable):
   - On Track: progress_ratio ≥ 0.9 × time_ratio
   - At Risk: progress_ratio ≥ 0.7 × time_ratio
   - Off Track: progress_ratio < 0.7 × time_ratio
   - Completed: progress_ratio ≥ 1.0

To change thresholds (e.g., 80% instead of 90%):
```sql
UPDATE in calculate_goal_status() function:
  IF (current_value::numeric / target_value) >=
     (extract(day from quarter_end - quarter_start) /
      extract(day from now()::date - quarter_start)) * 0.80 THEN
    status := 'on_track';
```

---

## Support & Resources

- **Engineering Team**: Contact for database modifications, custom queries
- **BD Operations**: For process questions and best practices
- **User Guide**: See `accountability-chart-user-guide.md`
- **API Reference**: See `accountability-chart-api-reference.md`


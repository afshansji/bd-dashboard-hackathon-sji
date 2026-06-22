# Accountability Chart - User Guide

**Last Updated**: February 12, 2026
**Module**: Business Development → Accountability Chart
**Access**: `/bd/accountability`

---

## Table of Contents

1. [Overview](#overview)
2. [Key Concepts](#key-concepts)
3. [User Roles & Permissions](#user-roles--permissions)
4. [User Flows by Role](#user-flows-by-role)
5. [Features & Workflows](#features--workflows)
6. [FAQ](#faq)

---

## Overview

The **Accountability Chart** is a goal-tracking system that enables teams to set quarterly objectives, track progress through daily/weekly activities, and maintain transparency across the organization.

### Key Features
- **Hierarchical Goals**: Team-level targets with individual rep goals aligned to them
- **Approval Workflow**: Draft → Pending Approval → Approved/Rejected
- **Activity Tracking**: Break goals into measurable daily/weekly activities
- **Progress Monitoring**: Automatic aggregation of activity progress to goals
- **Weekly Updates**: Submit progress, blockers, and help needed each week
- **Status Auto-Calculation**: System automatically determines if goals are On Track / At Risk / Off Track
- **Manager Dashboard**: Full visibility of team goals, rep submissions, and approvals

### Benefits
- **Transparency**: Everyone can see team goals and progress
- **Accountability**: Clear ownership and approval chain
- **Flexibility**: Activities can be any frequency (daily, weekly, bi-weekly, monthly, one-time)
- **Actionable Insights**: Weekly updates capture blockers and support needs
- **Automatic Tracking**: No manual status updates—system calculates based on actual progress

---

## Key Concepts

### Quarters
A **Quarter** is a time period (e.g., "Q1 2026") with status:
- **Planning**: Managers are setting up goals
- **Active**: Team is submitting progress
- **Completed**: Quarter ended, archived for historical reference
- **Archived**: Old quarters

**Access**: Only managers can create/edit quarters

### Team Goals
**Team Goals** are set by managers as quarterly targets for the entire team or department.

```
Example:
- Title: "Increase Sales Conversion Rate"
- Target: 25 deals (unit: "deals")
- Current: 8 deals
- Status: On Track (32% progress, 50% of quarter elapsed)
```

**Owner**: Manager
**Created by**: Manager
**Who can view**: Everyone
**Who can edit**: Managers only

### Rep Goals
**Rep Goals** are individual goals that reps set for themselves, optionally linked to a team goal.

```
Example:
- Title: "Close 4 deals"
- Linked Team Goal: "Increase Sales Conversion Rate"
- Target: 4 deals
- Current: 1 deal
- Approval Status: Draft → Pending Approval → Approved
```

**Lifecycle**:
1. Rep creates goal (Draft)
2. Rep submits for approval (Pending Approval)
3. Manager approves or rejects (Approved/Rejected)
4. Once approved, rep tracks progress via activities

**Permissions**:
- Reps can **create/edit their own goals** while in Draft or after Rejection
- Reps can **submit for approval** when ready
- Reps **cannot edit** Approved or Pending Approval goals (only managers can)
- Managers can **create/edit/approve/reject any rep's goals**

### Activities
**Activities** are the measurable daily/weekly/monthly actions that contribute to goal achievement.

```
Example Goal: "Close 4 deals"
  ├─ Activity 1: "Prospecting calls" (weekly, target: 10 per week)
  ├─ Activity 2: "Follow-up emails" (daily, target: 5 per day)
  └─ Activity 3: "Proposal presentations" (weekly, target: 2 per week)
```

**Frequency Options**:
- **Daily**: Every day
- **Weekly**: Once per week
- **Bi-weekly**: Every 2 weeks
- **Monthly**: Once per month
- **One-time**: One-time action

**Features**:
- Can be linked to **Project Tasks** (optional)
- Track current count vs. target count
- Status: Active / Paused / Completed

**Owner**: Rep (can be edited by rep or manager)

### Weekly Updates
**Weekly Updates** are progress submissions for an activity within a specific week.

```
Week of Jan 20-26, 2026:
- Activity: "Prospecting calls"
- Progress: 12 calls (target was 10)
- Status: On Track
- Blockers: "CRM access issues on Tuesday"
- Help Needed: "Need contact list from marketing"
```

**Required Fields**:
- Week dates (auto-populated based on activity)
- Progress value (how many completed this week)
- Status (On Track / At Risk / Off Track / Completed)
- Progress percentage (0-100%)

**Optional Fields**:
- Blockers: What's preventing progress?
- Help Needed: What support is needed?
- Notes: Additional context

**Frequency**: One submission per activity per week

### Progress & Status

#### Automatic Progress Aggregation
System automatically calculates progress bottom-up:

```
Weekly Update (progress_value)
  ↓ [SUM for all weeks]
Activity current_count
  ↓ [SUM for all activities]
Rep Goal current_value
  ↓ [SUM for all rep goals linked to team goal]
Team Goal current_value
```

#### Automatic Status Calculation
System auto-determines goal status by comparing progress ratio to time elapsed:

| Progress Ratio | Time Elapsed | Status |
|---|---|---|
| ≥ 90% | Any | **On Track** |
| 70-89% | Any | **At Risk** |
| < 70% | Any | **Off Track** |
| ≥ 100% | Any | **Completed** |

**Example**:
- Goal: Close 4 deals (100% target)
- Current: 2 deals (50% progress)
- Quarter is 50% complete
- Status: **On Track** (50% progress ≥ 45% expected at 50% of quarter)

---

## User Roles & Permissions

### Role Hierarchy
```
team_member (1)
    ↓
project_manager (3)
    ↓
manager (4)
    ↓
admin (5)
    ↓
super_admin (6)
```

### Permission Matrix

| Action | Team Member | Manager | Admin | Super Admin |
|--------|-------------|---------|-------|------------|
| **View all quarters** | ✓ | ✓ | ✓ | ✓ |
| **Create quarter** | ✗ | ✓ | ✓ | ✓ |
| **Edit quarter** | ✗ | ✓ | ✓ | ✓ |
| **View team goals** | ✓ | ✓ | ✓ | ✓ |
| **Create team goal** | ✗ | ✓ | ✓ | ✓ |
| **Edit team goal** | ✗ | ✓ | ✓ | ✓ |
| **View own rep goals** | ✓ | ✓ | ✓ | ✓ |
| **View all rep goals** | ✓ | ✓ | ✓ | ✓ |
| **Create own rep goal** | ✓ | ✓ | ✓ | ✓ |
| **Edit own goals (Draft)** | ✓ | ✓ | ✓ | ✓ |
| **Submit goal for approval** | ✓ | ✓ | ✓ | ✓ |
| **Edit others' goals** | ✗ | ✓ | ✓ | ✓ |
| **Approve/reject goals** | ✗ | ✓ | ✓ | ✓ |
| **Create activities** | ✓ (own) | ✓ (any) | ✓ | ✓ |
| **Edit activities** | ✓ (own) | ✓ (any) | ✓ | ✓ |
| **Submit weekly updates** | ✓ (own) | ✓ (any) | ✓ | ✓ |
| **Edit own updates** | ✓ | ✓ | ✓ | ✓ |
| **View all progress** | ✓ | ✓ | ✓ | ✓ |

---

## User Flows by Role

### 1. Team Member / Rep Flow

#### Creating and Submitting a Goal

**Step 1: Navigate to Accountability Chart**
- Go to **Business Development → Accountability Chart**
- Select the active quarter from the dropdown
- Click **"My Goals"** tab

**Step 2: Create a New Goal**
- Click **"New Goal"** button
- Fill in form:
  - **Title**: e.g., "Close 4 new deals"
  - **Description** (optional): Context or notes
  - **Target Value**: e.g., "4"
  - **Target Unit**: e.g., "deals"
  - **Link to Team Goal** (optional): Select from available team goals
- Click **"Create Goal"**
- Goal is created in **Draft** status

**Step 3: Define Activities**
- Click on the goal card → **"View Details"**
- On detail page, scroll to **"Activities"** section
- Click **"Add Activity"** button
- Fill in:
  - **Title**: e.g., "Prospecting calls"
  - **Description** (optional)
  - **Frequency**: Daily / Weekly / Bi-weekly / Monthly / One-time
  - **Target Count**: e.g., "10" (per week)
  - **Link to Task** (optional): Link to a project task
- Click **"Add Activity"**

**Step 4: Submit Goal for Approval**
- On goal detail page, click **"Submit for Approval"** button
- Status changes: Draft → **Pending Approval**
- Manager is notified to review

**Step 5: Track Weekly Progress**
- Once goal is **Approved**, submit weekly updates
- For each activity:
  - Click **"Add Update"** button in the timeline
  - Fill in form:
    - **Week**: Auto-populated (current week)
    - **Progress**: How many completed this week? e.g., "12"
    - **Status**: Select On Track / At Risk / Off Track / Completed
    - **Progress %**: 0-100% (auto-calculated based on target)
    - **Blockers** (optional): What's preventing progress?
    - **Help Needed** (optional): What support needed?
  - Click **"Submit Update"**

**Step 6: View Progress**
- Goal page shows:
  - Progress chart (current / target / remaining)
  - Activity list with cumulative progress
  - Weekly update timeline with status history

---

### 2. Manager Flow

#### Setting Up Quarterly Goals

**Step 1: Create Quarter**
- Navigate to **Business Development → Accountability Chart**
- Click **Quarter Selector** dropdown
- Click **"New Quarter"** button
- Fill in:
  - **Quarter Name**: e.g., "Q1 2026"
  - **Start Date**: Jan 1, 2026
  - **End Date**: Mar 31, 2026
- Click **"Create Quarter"**
- Quarter now appears in dropdown

**Step 2: Set Team Goals**
- Click **"Team Goals"** tab
- Click **"New Team Goal"** button
- Fill in:
  - **Title**: e.g., "Increase Sales Conversion Rate"
  - **Description**: Context for the team
  - **Target Value**: e.g., "25"
  - **Target Unit**: e.g., "deals"
- Click **"Create Goal"**

**Step 3: Monitor Rep Goal Submissions**
- Click **"Approvals"** tab (Approval Queue)
- See all pending rep goal approvals
- For each pending goal:
  - Review title, target, and rep who submitted it
  - Click goal to see full details
  - Either:
    - **"Approve Goal"** button → Goal is approved, rep can now add activities
    - **"Reject Goal"** button → Enter rejection reason → Goal reverts to Draft, rep can edit and resubmit

**Step 4: Monitor Team Progress**
- Click **"Team Progress"** tab
- See all rep goals linked to team goals
- Visual indicators show:
  - **On Track**: Green (≥90% progress ratio)
  - **At Risk**: Yellow (70-89% progress ratio)
  - **Off Track**: Red (<70% progress ratio)
  - **Completed**: Blue (≥100% progress)

**Step 5: Review Weekly Updates & Support**
- Click on any rep goal → **Goal Detail** page
- Scroll to **Activities** section
- See all weekly updates with:
  - Progress values
  - Status (On Track / At Risk / Off Track)
  - Blockers ("CRM access issues")
  - Help Needed ("Need contact list from marketing")
- Use this info to:
  - Identify reps who need support
  - Schedule 1-on-1 check-ins
  - Provide resources to unblock progress

**Step 6: Edit Rep Goals (if needed)**
- As a manager, you can edit any rep's goal
- Click on goal → **"Edit Goal"** button
- Modify target, description, approval status
- This is useful if:
  - Goal needs to be adjusted mid-quarter
  - You're creating goals on behalf of new reps

---

### 3. Admin / Super Admin Flow

Admins have all manager permissions plus:

#### Administrative Tasks

**View All Quarters & Goals**
- Access: **Business Development → Accountability Chart**
- Can view and manage all quarters, goals, and activities
- Can edit/delete any goal or activity

**Manage Quarters**
- Create/edit/delete quarters
- Change quarter status (planning → active → completed → archived)
- Used for:
  - Archiving old quarters for record-keeping
  - Setting up new quarters for organization
  - Bulk changes across all goals in a quarter

**Audit Trail**
- View all goals, activities, and weekly updates
- See who created/modified each item
- Track approval workflows and rejections

**Data Analysis**
- View aggregated progress across entire organization
- See patterns in goal achievement
- Identify teams/reps needing support

---

## Features & Workflows

### Workflow 1: Goal Approval Lifecycle

```
1. Rep Creates Goal (Draft)
   └─ Rep can edit/delete freely

2. Rep Submits for Approval
   └─ Status: Pending Approval
   └─ Manager is notified
   └─ Rep cannot edit (only manager can)

3a. Manager Approves Goal
    └─ Status: Approved
    └─ Rep is notified
    └─ Rep can now add activities & submit weekly updates

3b. Manager Rejects Goal
    └─ Status: Draft (reverted)
    └─ Rejection reason saved
    └─ Rep is notified
    └─ Rep can edit and resubmit
```

### Workflow 2: Progress Tracking

```
Rep submits weekly update for Activity
  ↓
System updates Activity current_count
  ↓
System updates Rep Goal current_value
  ↓
System calculates Rep Goal status
  ↓
System aggregates to Team Goal (if linked)
  ↓
System calculates Team Goal status
  ↓
System sends notification if status changed from On Track to At Risk
```

### Workflow 3: Quarterly Cycle

```
Q1 Planning Phase (2 weeks before quarter starts)
├─ Manager creates Quarter (status: planning)
├─ Manager sets Team Goals
└─ Reps create Rep Goals (linked to team goals)

Q1 Active Phase (during quarter)
├─ Reps submit weekly updates for activities
├─ Manager reviews progress & provides support
└─ System auto-calculates status and aggregates progress

Q1 Completion Phase (end of quarter)
├─ Manager changes Quarter status: active → completed
├─ All goals are finalized and archived
└─ New quarter begins planning
```

---

## FAQ

### Q: What happens if a rep goal is not approved before the quarter ends?
**A**: Unapproved goals remain in Draft or Pending Approval status. The rep can continue to edit and resubmit. If the quarter transitions to "Completed" status, the goal is archived but the rep can create new goals in the next quarter.

### Q: Can a rep change their goal target after approval?
**A**: No. Once approved, the rep cannot edit the goal (including target). Only managers can edit approved goals. This is intentional to maintain accountability. If the goal needs adjustment, the rep should discuss with their manager and the manager can edit it.

### Q: How is progress calculated if an activity has no weekly updates?
**A**: Activities with no weekly updates contribute 0 to progress. It's important to submit updates every week, even if progress is 0 (status: Off Track). Weekly updates are required to track progress.

### Q: What if a rep wants to change their goal mid-quarter?
**A**:
- If the goal is still in **Draft** or **Rejected**, they can edit it directly
- If the goal is **Approved**, only the manager can edit it
- The rep can create an additional goal without deleting the original
- The rep and manager should discuss and decide which approach is best

### Q: Can a rep see other reps' goals?
**A**: Yes, everyone can see all rep goals (full transparency). However:
- Reps can only edit their own goals (and their own activities/updates)
- Managers can edit any rep's goals
- System prevents accidental editing via RLS policies

### Q: What's the difference between "Goal Status" and "Approval Status"?
**A**:
- **Goal Status** (On Track / At Risk / Off Track / Completed): Auto-calculated based on progress vs. time. Visible to everyone.
- **Approval Status** (Draft / Pending / Approved / Rejected): Workflow status. Only relevant for rep goals. Once approved, the goal is active for progress tracking.

### Q: How often should weekly updates be submitted?
**A**: Once per week, ideally on the same day (e.g., Friday). The system tracks which week the update is for. You cannot submit two updates for the same activity in the same week.

### Q: What if activities have different frequencies (e.g., daily, weekly, monthly)?
**A**: Each activity has its own frequency. When submitting a weekly update, you enter the total progress for that activity for the week. The system calculates progress regardless of frequency. Example:
- Activity "Daily prospecting calls" (target: 5/day): Submit 25 for a week of 5 working days
- Activity "Monthly reports" (target: 1/month): Submit 0 for a week if not due, or 1 when complete

### Q: Can activities be linked to multiple goals?
**A**: No, each activity is linked to exactly one rep goal. If you need to track something across multiple goals, you can create separate activities for each goal.

### Q: What happens if I delete a goal?
**A**: Only managers can delete goals. When deleted:
- All activities linked to the goal are deleted
- All weekly updates are deleted
- This is permanent and cannot be undone
- Use with caution; consider archiving the quarter instead

### Q: Can quarters be deleted?
**A**: Only managers can delete quarters. This is permanent and deletes all goals/activities/updates in that quarter. Best practice: use quarter status transitions (planning → active → completed → archived) instead of deletion.

### Q: How do I know if my progress is "On Track"?
**A**: The system automatically shows a status badge. On your goal detail page:
- **On Track**: Green badge → Progress ratio ≥ 90% of time elapsed
- **At Risk**: Yellow badge → Progress ratio 70-89% of time elapsed
- **Off Track**: Red badge → Progress ratio < 70% of time elapsed
- **Completed**: Blue badge → Progress ratio ≥ 100%

You don't need to manually select status; it's calculated from your weekly updates and actual progress.

---

## Support

For questions or issues:
1. Contact your manager
2. Check the in-app help tooltips
3. Refer to this guide
4. Contact the BD Operations team


# Accountability Chart - API & Technical Reference

**Last Updated**: February 12, 2026
**Module**: Business Development → Accountability Chart
**Audience**: Developers, Engineers

---

## Table of Contents

1. [Overview](#overview)
2. [React Hooks API](#react-hooks-api)
3. [Database Operations](#database-operations)
4. [Data Types & Interfaces](#data-types--interfaces)
5. [Component API](#component-api)
6. [Error Handling](#error-handling)
7. [Caching & Query Keys](#caching--query-keys)
8. [Examples & Patterns](#examples--patterns)

---

## Overview

The Accountability Chart module uses:
- **Frontend**: React 18.3 + TypeScript 5.8 + TanStack Query 5.83 + React Hook Form 7.61
- **Backend**: Supabase PostgreSQL + RLS policies + Realtime subscriptions
- **UI**: shadcn/ui components + Tailwind CSS

### Architecture Layers

```
React Components (Pages + UI Components)
        ↓
React Hooks (Custom hooks with TanStack Query)
        ↓
Supabase Client + RLS Policies
        ↓
PostgreSQL Database (5 tables, 7 functions, 11 triggers)
```

---

## React Hooks API

All data fetching goes through custom hooks in `src/hooks/`. Hooks use TanStack Query for caching, deduplication, and background refetching.

### useAccountabilityQuarters

**Purpose**: Manage quarters

```typescript
import { useQuarters, useQuarter, useActiveQuarter, useCreateQuarter, useUpdateQuarter, useDeleteQuarter } from '@/hooks/useAccountabilityQuarters';

// ✅ Get all quarters
const { data: quarters, isLoading, error } = useQuarters();
// Returns: AccountabilityQuarter[]
// QueryKey: ['accountability_quarters']

// ✅ Get single quarter
const { data: quarter } = useQuarter(quarterId);
// Returns: AccountabilityQuarter | null
// QueryKey: ['accountability_quarter', quarterId]

// ✅ Get active quarter
const { data: activeQuarter } = useActiveQuarter();
// Returns: AccountabilityQuarter | null (status = 'active')
// QueryKey: ['accountability_quarters', 'active']

// ✅ Create quarter
const { mutate: createQuarter, isPending } = useCreateQuarter();
createQuarter(
  {
    name: 'Q1 2026',
    start_date: '2026-01-01',
    end_date: '2026-03-31',
  },
  {
    onSuccess: (newQuarter) => {
      console.log('Created:', newQuarter);
    },
    onError: (error) => {
      console.error('Error:', error.message);
    },
  }
);

// ✅ Update quarter
const { mutate: updateQuarter } = useUpdateQuarter();
updateQuarter({
  id: quarterId,
  status: 'active', // 'planning' | 'active' | 'completed' | 'archived'
  name: 'Q1 2026 Updated',
});

// ✅ Delete quarter (permanent!)
const { mutate: deleteQuarter } = useDeleteQuarter();
deleteQuarter(quarterId);
```

**Error Handling**:
```typescript
const { mutate: createQuarter } = useCreateQuarter();
createQuarter(data, {
  onError: (error: SupabaseError) => {
    if (error.code === '23505') {
      // Unique constraint violation
      toast({ title: 'Quarter name already exists', variant: 'destructive' });
    } else {
      toast({ title: 'Error creating quarter', description: error.message });
    }
  },
});
```

---

### useAccountabilityGoals

**Purpose**: Manage team goals and rep goals with approval workflow

```typescript
import {
  useTeamGoals,
  useTeamGoal,
  useRepGoals,
  useRepGoal,
  usePendingApprovalGoals,
  useCreateTeamGoal,
  useCreateRepGoal,
  useUpdateTeamGoal,
  useUpdateRepGoal,
  useSubmitGoalForApproval,
  useApproveGoal,
  useDeleteRepGoal,
  useDeleteTeamGoal,
} from '@/hooks/useAccountabilityGoals';

// ═══════════════════════════════════════════
// READING DATA
// ═══════════════════════════════════════════

// ✅ Get all team goals for quarter
const { data: teamGoals } = useTeamGoals(quarterId);
// Returns: TeamGoal[] (with profile enrichment)
// QueryKey: ['accountability_team_goals', quarterId]

// ✅ Get single team goal
const { data: teamGoal } = useTeamGoal(goalId);
// Returns: TeamGoal | null

// ✅ Get all rep goals for quarter
const { data: repGoals } = useRepGoals(quarterId);
// Returns: RepGoal[] (with profile + team goal enrichment)
// QueryKey: ['accountability_rep_goals', quarterId]

// ✅ Get rep goals for specific rep
const { data: myGoals } = useRepGoals(quarterId, { repId: userId });
// Returns: RepGoal[] (filtered by rep_id)

// ✅ Get single rep goal
const { data: repGoal } = useRepGoal(goalId);
// Returns: RepGoal | null (with all enrichment)

// ✅ Get pending approval goals (manager view)
const { data: pendingGoals } = usePendingApprovalGoals(quarterId);
// Returns: RepGoal[] (approval_status = 'pending_approval')
// QueryKey: ['accountability_rep_goals', quarterId, 'pending_approval']

// ═══════════════════════════════════════════
// WRITING DATA
// ═══════════════════════════════════════════

// ✅ Create team goal (manager only)
const { mutate: createTeamGoal } = useCreateTeamGoal();
createTeamGoal({
  quarter_id: quarterId,
  title: 'Increase Sales Conversion Rate',
  description: 'Drive more qualified leads through pipeline',
  target_value: 25,
  target_unit: 'deals',
});

// ✅ Create rep goal (rep or manager)
const { mutate: createRepGoal } = useCreateRepGoal();
createRepGoal({
  quarter_id: quarterId,
  rep_id: userId, // rep's user ID
  title: 'Close 4 deals',
  target_value: 4,
  target_unit: 'deals',
  team_goal_id: teamGoalId, // optional: link to team goal
  description: 'Aligned with team conversion goal',
});
// Initial status: Draft
// Initial approval_status: Draft

// ✅ Update team goal
const { mutate: updateTeamGoal } = useUpdateTeamGoal();
updateTeamGoal({
  id: goalId,
  title: 'New title',
  description: 'Updated description',
  target_value: 30, // can change target
  target_unit: 'deals',
});

// ✅ Update rep goal (rep can only edit draft/rejected)
const { mutate: updateRepGoal } = useUpdateRepGoal();
updateRepGoal({
  id: goalId,
  title: 'Updated title',
  target_value: 5, // increase target
  target_unit: 'deals',
  team_goal_id: newTeamGoalId, // can relink
});
// Note: manager can update ANY goal regardless of approval_status
// Note: rep can only update if approval_status IN ('draft', 'rejected')

// ✅ Submit goal for approval
const { mutate: submitGoalForApproval } = useSubmitGoalForApproval();
submitGoalForApproval(goalId);
// Changes approval_status: draft → pending_approval
// Notifies managers

// ✅ Approve goal (manager only)
const { mutate: approveGoal } = useApproveGoal();
approveGoal(goalId);
// Changes approval_status: pending_approval → approved
// Sets approved_by = currentUser
// Sets approved_at = now()
// Notifies rep

// ✅ Delete rep goal (manager only)
const { mutate: deleteRepGoal } = useDeleteRepGoal();
deleteRepGoal(goalId);
// Cascades: deletes all activities and weekly_updates

// ✅ Delete team goal (manager only)
const { mutate: deleteTeamGoal } = useDeleteTeamGoal();
deleteTeamGoal(goalId);
// Cascades: deletes all linked rep goals, activities, updates
```

---

### useAccountabilityActivities

**Purpose**: Manage activities tied to rep goals

```typescript
import {
  useActivities,
  useActivity,
  useCreateActivity,
  useUpdateActivity,
  useLinkTaskToActivity,
  useDeleteActivity,
} from '@/hooks/useAccountabilityActivities';

// ✅ Get all activities for a goal
const { data: activities } = useActivities(repGoalId);
// Returns: Activity[] (with linked task enrichment)
// QueryKey: ['accountability_activities', repGoalId]

// ✅ Get single activity
const { data: activity } = useActivity(activityId);
// Returns: Activity | null

// ✅ Create activity
const { mutate: createActivity } = useCreateActivity();
createActivity({
  rep_goal_id: goalId,
  title: 'Prospecting calls',
  description: 'Outbound calls to new prospects',
  frequency: 'weekly', // 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'one_time'
  target_count: 10, // target per frequency period
  linked_task_id: null, // optional
});

// ✅ Update activity
const { mutate: updateActivity } = useUpdateActivity();
updateActivity({
  id: activityId,
  title: 'Updated title',
  frequency: 'daily',
  target_count: 5,
  status: 'paused', // 'active' | 'paused' | 'completed'
});

// ✅ Link task to activity
const { mutate: linkTaskToActivity } = useLinkTaskToActivity();
linkTaskToActivity({
  activity_id: activityId,
  task_id: projectTaskId,
});
// Updates: linked_task_id field
// Bidirectional link visible in task detail

// ✅ Delete activity
const { mutate: deleteActivity } = useDeleteActivity();
deleteActivity(activityId);
// Cascades: deletes all weekly_updates for this activity
```

---

### useAccountabilityUpdates

**Purpose**: Manage weekly progress submissions

```typescript
import {
  useWeeklyUpdates,
  useWeeklyUpdate,
  useWeeklyUpdateForWeek,
  useCreateWeeklyUpdate,
  useUpdateWeeklyUpdate,
  useDeleteWeeklyUpdate,
  getWeekDates, // utility function
} from '@/hooks/useAccountabilityUpdates';

// ✅ Get all updates for activity
const { data: updates } = useWeeklyUpdates(activityId);
// Returns: WeeklyUpdate[] (with profile enrichment)
// QueryKey: ['accountability_weekly_updates', activityId]

// ✅ Get updates for specific week
const { data: weekUpdates } = useWeeklyUpdateForWeek(
  activityId,
  '2026-01-20' // week_start_date
);
// Returns: WeeklyUpdate | null (max one per week per activity)

// ✅ Get single update
const { data: update } = useWeeklyUpdate(updateId);
// Returns: WeeklyUpdate | null

// ✅ Get current week dates (utility)
const { weekStart, weekEnd } = getWeekDates(new Date());
// Returns: { weekStart: '2026-02-10', weekEnd: '2026-02-16' }

// ✅ Create weekly update
const { mutate: createWeeklyUpdate } = useCreateWeeklyUpdate();
createWeeklyUpdate({
  activity_id: activityId,
  week_start_date: '2026-02-10',
  week_end_date: '2026-02-16',
  progress_value: 12, // how many completed this week
  progress_percentage: 120, // optional: auto-calc if omitted
  status: 'on_track', // 'on_track' | 'at_risk' | 'off_track' | 'completed'
  blockers: 'CRM access issues on Tuesday', // optional
  help_needed: 'Need contact list from marketing', // optional
  notes: 'Had 2 successful calls', // optional
});

// ✅ Update weekly update
const { mutate: updateWeeklyUpdate } = useUpdateWeeklyUpdate();
updateWeeklyUpdate({
  id: updateId,
  progress_value: 15,
  status: 'completed',
  blockers: null, // resolved
  help_needed: 'Still need marketing list',
});

// ✅ Delete weekly update
const { mutate: deleteWeeklyUpdate } = useDeleteWeeklyUpdate();
deleteWeeklyUpdate(updateId);
// Note: Cannot have two updates for same activity in same week
```

---

### useAccountabilityChart (Legacy)

**Purpose**: Old accountability_chart table (deprecated)

```typescript
// ⚠️ Legacy: useAccountabilityChart references old accountability_chart table
// Status: May be deprecated
// Use: useAccountabilityQuarters, useAccountabilityGoals instead
const { data: chart } = useAccountabilityChart();
```

---

## Database Operations

### Direct Supabase Client (if needed)

**Note**: Avoid direct client usage in components. Always use hooks.

```typescript
import { supabase } from '@/integrations/supabase/client';

// ✅ Read quarters
const { data, error } = await supabase
  .from('accountability_quarters')
  .select('*')
  .eq('status', 'active')
  .single();

// ✅ Insert goal (RLS enforced!)
const { data, error } = await supabase
  .from('accountability_team_goals')
  .insert({
    quarter_id: quarterId,
    title: 'New goal',
    target_value: 10,
    target_unit: 'units',
    created_by: userId,
  })
  .select()
  .single();

if (error) {
  if (error.code === '42501') {
    // RLS policy violation
    console.error('Not authorized to create team goal');
  } else if (error.code === '23505') {
    // Unique constraint violation
    console.error('Goal name already exists for this quarter');
  }
}

// ✅ Update with row-level security
const { data, error } = await supabase
  .from('accountability_rep_goals')
  .update({ status: 'on_track' })
  .eq('id', goalId)
  .select()
  .single();
// RLS will prevent update if:
//   - User is not rep_id (and not manager)
//   - Approval status not in ('draft', 'rejected')
```

### Call Database Functions

```typescript
// ✅ Trigger progress calculation manually
const { data, error } = await supabase
  .rpc('update_goal_progress_from_activities', {
    goal_id: repGoalId,
  });

if (error) {
  console.error('Function error:', error.message);
}

// ✅ Calculate goal status
const { data: status, error } = await supabase
  .rpc('calculate_goal_status', {
    goal_id: goalId,
    current_value: 15,
    target_value: 20,
    quarter_id: quarterId,
  });
```

---

## Data Types & Interfaces

### TypeScript Types

All types are auto-generated from Supabase schema and located in `src/integrations/supabase/types.ts` (5163 lines).

```typescript
// Enums
export type QuarterStatus = 'planning' | 'active' | 'completed' | 'archived';
export type GoalStatus = 'on_track' | 'at_risk' | 'off_track' | 'completed';
export type GoalApprovalStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected';
export type ActivityFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'one_time';
export type ActivityStatus = 'active' | 'paused' | 'completed';

// Tables (simplified)
export interface AccountabilityQuarter {
  id: string;
  name: string;
  start_date: string; // DATE (YYYY-MM-DD)
  end_date: string;
  status: QuarterStatus;
  created_by: string; // UUID
  created_at: string; // TIMESTAMPTZ ISO 8601
  updated_at: string;
}

export interface AccountabilityTeamGoal {
  id: string;
  quarter_id: string;
  title: string;
  description: string | null;
  target_value: number;
  target_unit: string;
  current_value: number; // auto-calculated from rep goals
  status: GoalStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  // With enrichment:
  profiles?: { full_name: string; email: string };
}

export interface AccountabilityRepGoal {
  id: string;
  quarter_id: string;
  team_goal_id: string | null; // nullable for standalone goals
  rep_id: string;
  title: string;
  description: string | null;
  target_value: number;
  target_unit: string;
  current_value: number; // auto-calculated from activities
  status: GoalStatus;
  approval_status: GoalApprovalStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  // With enrichment:
  profiles?: { full_name: string; email: string }; // rep profile
  accountability_team_goals?: AccountabilityTeamGoal | null; // team goal
}

export interface AccountabilityActivity {
  id: string;
  rep_goal_id: string;
  title: string;
  description: string | null;
  frequency: ActivityFrequency;
  target_count: number; // per frequency period
  current_count: number; // auto-calculated from weekly updates
  linked_task_id: string | null;
  status: ActivityStatus;
  created_at: string;
  updated_at: string;
  // With enrichment:
  project_tasks?: { id: string; title: string } | null;
}

export interface AccountabilityWeeklyUpdate {
  id: string;
  activity_id: string;
  week_start_date: string; // DATE
  week_end_date: string;
  progress_value: number;
  progress_percentage: number; // 0-100
  status: GoalStatus;
  blockers: string | null;
  help_needed: string | null;
  notes: string | null;
  submitted_by: string;
  created_at: string;
  updated_at: string;
  // With enrichment:
  profiles?: { full_name: string; email: string };
}
```

---

## Component API

### Component Usage Examples

#### Page: `AccountabilityChart.tsx`

```typescript
// Main dashboard with tabs:
// - Quarters (selector)
// - Team Goals (manager view)
// - Team Progress (visual dashboard)
// - Approvals (pending goals)
// - My Goals (rep's own goals)

<AccountabilityChart />

// Internal:
// - QuarterSelector
// - TeamGoalsList
// - TeamProgressDashboard
// - GoalApprovalQueue
// - RepGoalsList
```

#### Page: `AccountabilityGoalDetail.tsx`

```typescript
// Detail view for single goal
// Props: { goalId } from URL params

<AccountabilityGoalDetail goalId="uuid" />

// Internal:
// - GoalProgressChart
// - GoalStatusBadge
// - ActivityList (with WeeklyUpdateForm)
// - WeeklyUpdateTimeline
// - EditGoalDialog (manager only)
```

### Component Props

#### `GoalForm.tsx`

```typescript
interface GoalFormProps {
  initialData?: Partial<AccountabilityRepGoal | AccountabilityTeamGoal>;
  quarterIdId: string;
  onSuccess?: (goal: AccountabilityRepGoal | AccountabilityTeamGoal) => void;
  isTeamGoal?: boolean; // true for team goals, false for rep goals
}

<GoalForm
  quarterId={quarterId}
  initialData={goalToEdit}
  isTeamGoal={false}
  onSuccess={(goal) => {
    console.log('Goal created/updated:', goal);
    // Refetch or navigate
  }}
/>
```

#### `GoalApprovalQueue.tsx`

```typescript
interface GoalApprovalQueueProps {
  quarterId: string;
}

<GoalApprovalQueue quarterId={activeQuarter.id} />
// Displays pending approval goals
// Calls useApproveGoal() and useSubmitGoalForApproval() mutations
```

#### `ActivityForm.tsx`

```typescript
interface ActivityFormProps {
  repGoalId: string;
  initialData?: Partial<AccountabilityActivity>;
  onSuccess?: (activity: AccountabilityActivity) => void;
}

<ActivityForm
  repGoalId={goalId}
  initialData={activityToEdit}
  onSuccess={() => {
    // Refetch activities
  }}
/>
```

#### `WeeklyUpdateForm.tsx`

```typescript
interface WeeklyUpdateFormProps {
  activity: AccountabilityActivity;
  weekStartDate: string; // ISO 8601 date
  weekEndDate: string;
  initialData?: Partial<AccountabilityWeeklyUpdate>;
  onSuccess?: (update: AccountabilityWeeklyUpdate) => void;
}

<WeeklyUpdateForm
  activity={activity}
  weekStartDate={weekStart}
  weekEndDate={weekEnd}
  onSuccess={() => {
    // Refetch updates and recalculate progress
  }}
/>
```

---

## Error Handling

### Common Errors

#### RLS Policy Violations (42501)

```typescript
const { mutate: updateGoal } = useUpdateRepGoal();
updateGoal(
  { id: goalId, title: 'New title' },
  {
    onError: (error: SupabaseError) => {
      if (error.code === '42501') {
        toast({
          title: 'Not Authorized',
          description: 'You can only edit your own goals or if you are a manager',
          variant: 'destructive',
        });
      }
    },
  }
);
```

#### Unique Constraint Violations (23505)

```typescript
// Example: Creating duplicate team goal name in quarter
const { mutate: createTeamGoal } = useCreateTeamGoal();
createTeamGoal(data, {
  onError: (error: SupabaseError) => {
    if (error.code === '23505') {
      toast({
        title: 'Duplicate Goal',
        description: 'A goal with this title already exists in this quarter',
        variant: 'destructive',
      });
    }
  },
});
```

#### Foreign Key Constraint Violations (23503)

```typescript
// Example: Creating activity for non-existent goal
const { mutate: createActivity } = useCreateActivity();
createActivity(
  { rep_goal_id: invalidId, ... },
  {
    onError: (error: SupabaseError) => {
      if (error.code === '23503') {
        toast({
          title: 'Invalid Goal',
          description: 'The goal you selected does not exist',
          variant: 'destructive',
        });
      }
    },
  }
);
```

### Error Handling Pattern

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';

const queryClient = useQueryClient();

const { mutate: createGoal } = useCreateRepGoal();

createGoal(goalData, {
  onSuccess: (newGoal) => {
    // Invalidate caches
    queryClient.invalidateQueries({
      queryKey: ['accountability_rep_goals', quarterId],
    });
    // Show success
    toast({
      title: 'Goal Created',
      description: `"${newGoal.title}" created successfully`,
    });
    // Navigate or refocus
  },
  onError: (error: SupabaseError) => {
    // Log for debugging
    console.error('Goal creation error:', error);
    // Show error to user
    toast({
      title: 'Error Creating Goal',
      description: error.message || 'Please try again',
      variant: 'destructive',
    });
  },
});
```

---

## Caching & Query Keys

### TanStack Query Setup

```typescript
// In src/hooks/useAccountabilityGoals.tsx
const queryClient = useQueryClient();

// Query keys structure
const queryKeys = {
  all: () => ['accountability'] as const,
  goals: () => [...queryKeys.all(), 'goals'] as const,
  goal: (id: string) => [...queryKeys.goals(), id] as const,
  repGoals: (quarterId: string) => [...queryKeys.goals(), 'rep', quarterId] as const,
  teamGoals: (quarterId: string) => [...queryKeys.goals(), 'team', quarterId] as const,
  pendingApprovals: (quarterId: string) => [
    ...queryKeys.goals(),
    'pending_approval',
    quarterId,
  ] as const,
};
```

### Cache Invalidation

```typescript
// Manual invalidation on mutation
onSuccess: () => {
  // Invalidate single quarter's goals
  queryClient.invalidateQueries({
    queryKey: ['accountability_rep_goals', quarterId],
  });

  // Or invalidate all accountability data
  queryClient.invalidateQueries({
    queryKey: ['accountability'],
  });

  // Combine with other domains
  queryClient.invalidateQueries({
    queryKey: ['project_tasks'], // if linked to task
  });
};
```

### Background Refetch

```typescript
// useQuery hook options
useQuery({
  queryKey: ['accountability_rep_goals', quarterId],
  queryFn: async () => {
    // fetch data
  },
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 30 * 60 * 1000, // 30 minutes (was cacheTime)
  refetchOnWindowFocus: true, // refetch when tab regains focus
  refetchInterval: false, // no polling
});
```

---

## Examples & Patterns

### Pattern 1: Create Goal with Form

```typescript
import { useCreateRepGoal } from '@/hooks/useAccountabilityGoals';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const goalSchema = z.object({
  title: z.string().min(1, 'Title required'),
  target_value: z.number().positive('Must be positive'),
  target_unit: z.string().min(1, 'Unit required'),
});

type GoalFormData = z.infer<typeof goalSchema>;

export function CreateGoalDialog({ quarterId, onSuccess }) {
  const form = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
  });

  const { mutate: createGoal, isPending } = useCreateRepGoal();

  function onSubmit(data: GoalFormData) {
    createGoal(
      {
        quarter_id: quarterId,
        ...data,
      },
      {
        onSuccess,
      }
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register('title')} />
      <input {...form.register('target_value', { valueAsNumber: true })} />
      <input {...form.register('target_unit')} />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Goal'}
      </button>
    </form>
  );
}
```

### Pattern 2: Display Goals with Loading/Error States

```typescript
import { useRepGoals } from '@/hooks/useAccountabilityGoals';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function RepGoalsList({ quarterId }) {
  const { data: goals, isLoading, error } = useRepGoals(quarterId);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to load goals: {error.message}</AlertDescription>
      </Alert>
    );
  }

  // Empty state
  if (!goals || goals.length === 0) {
    return <p className="text-muted-foreground">No goals created yet</p>;
  }

  // Success state
  return (
    <div className="space-y-2">
      {goals.map((goal) => (
        <GoalCard key={goal.id} goal={goal} />
      ))}
    </div>
  );
}
```

### Pattern 3: Goal Approval Workflow

```typescript
import { useApproveGoal } from '@/hooks/useAccountabilityGoals';
import { toast } from '@/components/ui/use-toast';

export function GoalApprovalButtons({ goal }) {
  const [rejectionReason, setRejectionReason] = useState('');

  const { mutate: approveGoal, isPending: isApproving } = useApproveGoal();

  const handleApprove = () => {
    approveGoal(goal.id, {
      onSuccess: () => {
        toast({ title: 'Goal Approved' });
      },
    });
  };

  const handleReject = async () => {
    // Show rejection reason dialog
    const reason = await showReasonDialog();
    if (reason) {
      // Note: Current implementation doesn't pass reason through hook
      // Would need custom mutation if reason needed
      approveGoal(goal.id, {
        onSuccess: () => {
          toast({ title: 'Goal Rejected' });
        },
      });
    }
  };

  return (
    <div className="flex gap-2">
      <Button onClick={handleApprove} disabled={isApproving}>
        Approve
      </Button>
      <Button onClick={handleReject} variant="outline" disabled={isApproving}>
        Reject
      </Button>
    </div>
  );
}
```

### Pattern 4: Progress Tracking

```typescript
import { useWeeklyUpdates, useCreateWeeklyUpdate } from '@/hooks/useAccountabilityUpdates';
import { getWeekDates } from '@/hooks/useAccountabilityUpdates';

export function ActivityProgressTracker({ activity }) {
  const { weekStart, weekEnd } = getWeekDates(new Date());

  const { data: updates } = useWeeklyUpdates(activity.id);
  const { mutate: createUpdate, isPending } = useCreateWeeklyUpdate();

  const currentWeekUpdate = updates?.find(
    (u) => u.week_start_date === weekStart
  );

  const handleSubmitProgress = (progressValue: number) => {
    const progressPercent = Math.round(
      (progressValue / activity.target_count) * 100
    );

    createUpdate(
      {
        activity_id: activity.id,
        week_start_date: weekStart,
        week_end_date: weekEnd,
        progress_value: progressValue,
        progress_percentage: progressPercent,
        status: progressPercent >= 90 ? 'on_track' : 'at_risk',
      },
      {
        onSuccess: () => {
          toast({ title: 'Progress updated' });
        },
      }
    );
  };

  return (
    <div>
      <p>Target: {activity.target_count} per week</p>
      {currentWeekUpdate && (
        <p>This week: {currentWeekUpdate.progress_value} completed</p>
      )}
      <button onClick={() => handleSubmitProgress(10)} disabled={isPending}>
        Submit Progress
      </button>
    </div>
  );
}
```

---

## Testing

### Unit Test Example

```typescript
// src/__tests__/hooks/useAccountabilityGoals.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useRepGoals } from '@/hooks/useAccountabilityGoals';

describe('useRepGoals', () => {
  it('should fetch rep goals for quarter', async () => {
    const { result } = renderHook(() => useRepGoals('quarter-123'));

    // Loading state
    expect(result.current.isLoading).toBe(true);

    // Loaded state
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
  });

  it('should handle errors', async () => {
    const { result } = renderHook(() => useRepGoals('invalid-id'));

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });
});
```

---

## Support & Resources

- **Frontend Docs**: See CLAUDE.md for architecture overview
- **User Guide**: See `accountability-chart-user-guide.md`
- **Admin Guide**: See `accountability-chart-admin-guide.md`
- **Supabase Docs**: https://supabase.com/docs
- **TanStack Query**: https://tanstack.com/query
- **React Hook Form**: https://react-hook-form.com/


# BD Manager Agent - Revised Implementation Plan

**Created**: January 20, 2026
**Status**: Implementation Ready
**Complexity**: Medium (3-4 weeks implementation)

---

## Executive Summary

### Goal
Create a BD Manager Agent that leverages **existing data collection systems** to automatically generate weekly performance reports and WIG agendas for BD team management.

### Key Principle
**NO NEW DATA ENTRY UI** - The agent reads from existing modules:
- ✅ DHS submissions (already exists)
- ✅ EOD submissions (already exists)
- ✅ Accountability Chart with quarterly goals (already exists)
- ✅ Tasks module (already exists)
- ✅ Upwork data from Google Sheets (already exists)

### What We're Building
1. **BD Manager AI Agent** - Configured in `/adminpanel/ai/agents`
2. **Edge Function** - Reads existing data and generates weekly reports
3. **Report Viewer** - Dashboard to view generated reports
4. **Scheduled Execution** - Auto-runs every Monday morning

---

## Table of Contents

1. [Existing Data Sources](#existing-data-sources)
2. [AI Agent Configuration](#ai-agent-configuration)
3. [Edge Function Implementation](#edge-function-implementation)
4. [Report Viewer UI](#report-viewer-ui)
5. [Implementation Steps](#implementation-steps)
6. [Database Schema (Minimal)](#database-schema-minimal)
7. [Testing & Deployment](#testing--deployment)

---

## Existing Data Sources

### 1. DHS (Daily Health Score)
**Table**: `dhs_submissions`

**Data Available**:
```typescript
{
  user_id: string;
  date: string;
  follow_ups_done: number;
  calls_made: number;
  meetings_booked: number;
  pipeline_updated: boolean;
  score: number | null;
  status: 'on_track' | 'at_risk' | 'blocked';
  notes: string | null;
}
```

**Hooks**: `useDHSSubmissions`, `useDHSTeamSummary`, `useAllDHSSubmissions`

**Query Pattern** (for BD Manager Agent):
```typescript
// Get all DHS submissions for the week
const { data: dhsData } = await supabase
  .from('dhs_submissions')
  .select(`
    *,
    profiles:user_id (
      id,
      full_name,
      email
    )
  `)
  .gte('date', weekStartDate)
  .lte('date', weekEndDate)
  .order('date', { ascending: true });
```

---

### 2. EOD (End of Day)
**Table**: `eod_submissions`

**Data Available**:
```typescript
{
  user_id: string;
  date: string;
  tasks_completed: string;
  tomorrow_plan: string | null;
  challenges: string | null;
  hours_worked: number | null;
  project_id: string | null;
}
```

**Hooks**: `useEODSubmissions`, `useTeamSummaries`

**Additional**: `generate-eod-summary` Edge Function provides AI-generated summaries with productivity scores

**Query Pattern**:
```typescript
// Get all EOD submissions for the week
const { data: eodData } = await supabase
  .from('eod_submissions')
  .select(`
    *,
    profiles:user_id (
      id,
      full_name,
      email
    )
  `)
  .gte('date', weekStartDate)
  .lte('date', weekEndDate)
  .order('date', { ascending: true });
```

---

### 3. Accountability Chart (Quarterly Goals)
**Tables**:
- `accountability_quarters`
- `accountability_team_goals`
- `accountability_rep_goals`
- `accountability_activities`
- `accountability_weekly_updates`

**Data Available**:
```typescript
// Rep Goals
{
  quarter_id: string;
  rep_id: string;
  title: string;
  target_value: number;
  target_unit: string;
  current_value: number;
  status: 'on_track' | 'at_risk' | 'off_track' | 'completed';
  approval_status: 'approved' | 'pending_approval' | 'rejected';
}

// Activities (linked to goals)
{
  rep_goal_id: string;
  title: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  target_count: number;
  current_count: number;
  status: 'active' | 'paused' | 'completed';
}

// Weekly Updates (progress reports)
{
  activity_id: string;
  week_start_date: string;
  progress_value: number;
  progress_percentage: number;
  status: GoalStatus;
  blockers: string | null;
  help_needed: string | null;
  notes: string | null;
}
```

**Hooks**: `useRepGoals`, `useActivities`, `useWeeklyUpdates`, `useActiveQuarter`

**Query Pattern**:
```typescript
// Get current quarter
const { data: activeQuarter } = await supabase
  .from('accountability_quarters')
  .select('*')
  .eq('status', 'active')
  .single();

// Get all rep goals for the quarter
const { data: repGoals } = await supabase
  .from('accountability_rep_goals')
  .select(`
    *,
    profiles:rep_id (
      id,
      full_name,
      email
    ),
    accountability_activities (
      *,
      accountability_weekly_updates (
        *
      )
    )
  `)
  .eq('quarter_id', activeQuarter.id)
  .eq('approval_status', 'approved');
```

---

### 4. Tasks Module
**Table**: `project_tasks`

**Data Available**:
```typescript
{
  title: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to: string;
  estimated_hours: number;
  actual_hours: number;
  due_date: string;
  completed_at: string | null;
}
```

**Hooks**: `useProjectTasks`, `useMyProjectTasks`, `useAllProjectTasks`

**Query Pattern**:
```typescript
// Get tasks completed this week
const { data: completedTasks } = await supabase
  .from('project_tasks')
  .select(`
    *,
    profiles:assigned_to (
      id,
      full_name
    )
  `)
  .eq('status', 'completed')
  .gte('completed_at', weekStartDate)
  .lte('completed_at', weekEndDate);
```

---

### 5. Upwork Data (Google Sheets)
**Source**: https://docs.google.com/spreadsheets/d/1vEpdB36TWmNro3wYCYq62k-khLXhdmWnonabkBT-P1Q/edit?gid=513030245

**Expected Columns**:
- Date
- BD Rep Name
- Proposals Sent
- Invites Received
- Interviews Booked
- Wins
- Losses
- Estimated Value
- Actual Revenue

**Query Pattern**: Use Google Sheets API v4 (already documented in previous plan)

---

## AI Agent Configuration

### Agent Record in `ai_agents` Table

This is what gets created when you configure the agent on `/adminpanel/ai/agents` page.

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
  -- Basic Info
  'BD Manager Weekly Review',
  'Automated weekly performance review agent for BD team. Analyzes data from DHS, EOD, Accountability Chart, Tasks, and Upwork to generate comprehensive weekly reports and WIG agendas.',
  'bd-manager-weekly-review',
  'performance_analysis',
  'bd_performance',

  -- System Prompt
  'You are the BD Manager Agent, an AI assistant specializing in analyzing Business Development team performance data.

Your role:
- Analyze weekly BD execution data from multiple sources
- Identify performance trends, risks, and opportunities
- Generate actionable insights for managers and coaches
- Create WIG (Wildly Important Goal) agendas for team meetings

Data sources you analyze:
1. DHS (Daily Health Score) - Daily metrics: follow-ups, calls, meetings, pipeline updates
2. EOD (End of Day) - Daily accomplishments, hours worked, challenges, blockers
3. Accountability Chart - Quarterly goals, activities, and weekly progress updates
4. Tasks - Completed tasks, hours spent, priorities
5. Upwork - Proposals, invites, interviews, wins/losses

Output requirements:
- Clear executive summary (2-3 sentences)
- Rep-by-rep performance analysis with specific metrics
- Team-level aggregated metrics vs targets
- Risk identification (declining trends, missing data, repeated blockers)
- Actionable coaching recommendations with priority levels
- WIG-ready agenda format for team meetings

Analysis criteria:
- DHS submission consistency (target: 100%)
- EOD submission consistency (target: 95%+)
- Quarterly goal progress (on track vs at risk)
- Activity completion rates
- Blocker resolution status
- Task throughput and quality
- Upwork pipeline health

Tone: Professional, data-driven, supportive, action-oriented.',

  -- Prompt Template (with placeholders)
  'Analyze BD team performance for the week of {{week_start_date}} to {{week_end_date}}.

## Current Quarter Context
**Quarter**: {{quarter_name}}
**Quarter Progress**: {{quarter_progress_percentage}}% complete
**Weeks Remaining**: {{weeks_remaining}}

## Data Summary

### 1. DHS (Daily Health Score)
{{dhs_summary}}

**Submission Rate**: {{dhs_submission_rate}}% ({{dhs_submissions_count}}/{{expected_dhs_submissions}})

**Team Averages**:
- Follow-ups done: {{avg_follow_ups}}/day
- Calls made: {{avg_calls}}/day
- Meetings booked: {{avg_meetings}}/day
- Pipeline updated: {{pipeline_update_rate}}%

**Status Breakdown**:
- On Track: {{dhs_on_track_count}} reps
- At Risk: {{dhs_at_risk_count}} reps
- Blocked: {{dhs_blocked_count}} reps

### 2. EOD (End of Day)
{{eod_summary}}

**Submission Rate**: {{eod_submission_rate}}% ({{eod_submissions_count}}/{{expected_eod_submissions}})

**Team Totals**:
- Hours worked: {{total_hours_worked}} hours
- Average hours/rep: {{avg_hours_per_rep}} hours

**Common Challenges**:
{{top_challenges}}

### 3. Quarterly Goals & Activities
{{quarterly_goals_summary}}

**Team Goals** ({{team_goals_count}}):
{{team_goals_list}}

**Rep Goals** ({{rep_goals_count}}):
{{rep_goals_breakdown}}

**Activities** ({{activities_count}}):
{{activities_summary}}

**Weekly Updates** ({{weekly_updates_count}}):
{{weekly_updates_summary}}

**Blockers Reported**:
{{blockers_list}}

### 4. Tasks Completed
{{tasks_summary}}

**This Week**:
- Completed: {{tasks_completed}} tasks
- In Progress: {{tasks_in_progress}} tasks
- Blocked: {{tasks_blocked}} tasks
- Total hours logged: {{tasks_hours_logged}} hours

### 5. Upwork Activity
{{upwork_summary}}

**Team Totals**:
- Proposals sent: {{upwork_proposals}} (target: {{upwork_target_proposals}})
- Invites received: {{upwork_invites}}
- Interviews booked: {{upwork_interviews}}
- Wins: {{upwork_wins}}
- Estimated value: ${{upwork_estimated_value}}

**By Rep**:
{{upwork_by_rep}}

---

## Analysis Instructions

Provide a comprehensive weekly review in the following structured format:

### 1. Executive Summary
- 2-3 sentence overview of team performance
- Highlight most significant wins and concerns
- Overall team health assessment

### 2. Rep-by-Rep Analysis
For each BD rep, provide:
- **Overall Status**: Excellent / On Track / Needs Support / At Risk
- **DHS Consistency**: Submission rate, average score, trend
- **EOD Consistency**: Submission rate, challenges mentioned
- **Goal Progress**: Progress toward quarterly goals (percentage)
- **Activity Completion**: Weekly activity targets vs actual
- **Upwork Performance**: Proposals, interviews, wins vs targets
- **Task Completion**: Tasks completed, hours logged
- **Key Highlights**: Top 2-3 achievements
- **Concerns**: Top 2-3 issues or risks
- **Recommended Actions**: Specific next steps

### 3. Team Metrics vs Targets
Compare team performance to targets:
- DHS submission rate (target: 100%)
- EOD submission rate (target: 95%+)
- Average follow-ups/day (target: {{target_follow_ups}})
- Average calls/day (target: {{target_calls}})
- Average meetings/week (target: {{target_meetings}})
- Quarterly goals on track (target: 80%+)
- Upwork proposals (target: {{upwork_target_proposals}})
- Task completion rate

### 4. Risk Identification & Early Warnings
Flag these critical issues:
- Reps with <60% DHS submission rate (3+ missing days)
- Reps with <80% EOD submission rate
- Quarterly goals marked "Off Track" or "At Risk"
- Declining DHS scores (2+ weeks declining trend)
- Low Upwork activity (<50% of target)
- Repeated blockers (same blocker >2 weeks)
- Tasks blocked >1 week
- Zero weekly updates submitted

### 5. Coaching Recommendations
Provide actionable recommendations:
- **High Priority**: Immediate attention needed (this week)
- **Medium Priority**: Address within 2 weeks
- **Low Priority**: Monitor and plan for next month

For each recommendation:
- Rep name (if individual) or "Team" (if team-wide)
- Issue description
- Suggested action
- Success criteria

### 6. WIG Agenda
Structure for team meeting:

**A. Wins**
- Top 3-5 team achievements this week
- Individual standout performances

**B. Metrics Review**
- Key metrics vs targets (with visual indicators)
- Week-over-week trends

**C. Progress vs Quarterly Goals**
- On-track goals to celebrate
- At-risk goals needing attention
- Action items to get back on track

**D. Risks & Stuck Items**
- Critical blockers by rep
- Escalation needs
- Resource gaps

**E. Coaching Focus Areas**
- Skills to develop
- Processes to improve
- Support needed

**F. Action Items for Next Week**
- Specific, assignable tasks
- Owners and deadlines
- Success criteria

---

Provide your analysis in structured JSON format matching the schema defined in the agent config.

**Important**: Base all analysis ONLY on the data provided above. Do not make assumptions or add information not present in the source data.',

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
    "targets": {
      "dhs_submission_rate": 100,
      "eod_submission_rate": 95,
      "follow_ups_per_day": 5,
      "calls_per_day": 8,
      "meetings_per_week": 3,
      "upwork_proposals_per_week": 10,
      "goals_on_track_percentage": 80
    },
    "outputSchema": {
      "type": "object",
      "required": [
        "executive_summary",
        "rep_performance",
        "team_metrics",
        "risks",
        "coaching_recommendations",
        "wig_agenda"
      ],
      "properties": {
        "executive_summary": {
          "type": "string",
          "description": "2-3 sentence overview"
        },
        "team_health_score": {
          "type": "number",
          "description": "Overall team health 0-100"
        },
        "rep_performance": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["rep_id", "rep_name", "overall_status"],
            "properties": {
              "rep_id": { "type": "string" },
              "rep_name": { "type": "string" },
              "overall_status": {
                "enum": ["excellent", "on_track", "needs_support", "at_risk"]
              },
              "dhs_submission_rate": { "type": "number" },
              "dhs_avg_score": { "type": "number" },
              "dhs_trend": { "enum": ["improving", "stable", "declining"] },
              "eod_submission_rate": { "type": "number" },
              "goal_progress_percentage": { "type": "number" },
              "activities_completion_rate": { "type": "number" },
              "upwork_proposals": { "type": "number" },
              "upwork_wins": { "type": "number" },
              "tasks_completed": { "type": "number" },
              "highlights": {
                "type": "array",
                "items": { "type": "string" },
                "maxItems": 3
              },
              "concerns": {
                "type": "array",
                "items": { "type": "string" },
                "maxItems": 3
              },
              "recommended_actions": {
                "type": "array",
                "items": { "type": "string" }
              }
            }
          }
        },
        "team_metrics": {
          "type": "object",
          "properties": {
            "dhs_submission_rate": { "type": "number" },
            "eod_submission_rate": { "type": "number" },
            "avg_follow_ups_per_day": { "type": "number" },
            "avg_calls_per_day": { "type": "number" },
            "avg_meetings_per_week": { "type": "number" },
            "goals_on_track_percentage": { "type": "number" },
            "total_upwork_proposals": { "type": "number" },
            "total_upwork_wins": { "type": "number" },
            "total_tasks_completed": { "type": "number" },
            "total_hours_logged": { "type": "number" },
            "week_over_week_comparison": {
              "type": "object",
              "properties": {
                "dhs_change": { "type": "string" },
                "eod_change": { "type": "string" },
                "upwork_change": { "type": "string" },
                "tasks_change": { "type": "string" }
              }
            }
          }
        },
        "risks": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "severity": { "enum": ["critical", "high", "medium", "low"] },
              "category": {
                "enum": [
                  "missing_data",
                  "declining_performance",
                  "repeated_blocker",
                  "goal_at_risk",
                  "resource_issue"
                ]
              },
              "description": { "type": "string" },
              "affected_reps": {
                "type": "array",
                "items": { "type": "string" }
              },
              "impact": { "type": "string" },
              "recommended_action": { "type": "string" }
            }
          }
        },
        "coaching_recommendations": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "priority": { "enum": ["high", "medium", "low"] },
              "rep_name": { "type": "string" },
              "issue": { "type": "string" },
              "suggested_action": { "type": "string" },
              "success_criteria": { "type": "string" },
              "timeline": { "type": "string" }
            }
          }
        },
        "wig_agenda": {
          "type": "object",
          "required": [
            "wins",
            "metrics_review",
            "progress_vs_goals",
            "risks_and_stuck_items",
            "coaching_focus",
            "action_items"
          ],
          "properties": {
            "wins": {
              "type": "array",
              "items": { "type": "string" },
              "minItems": 3,
              "maxItems": 5
            },
            "metrics_review": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "metric": { "type": "string" },
                  "actual": { "type": "number" },
                  "target": { "type": "number" },
                  "status": { "enum": ["above_target", "on_target", "below_target"] },
                  "trend": { "enum": ["up", "flat", "down"] }
                }
              }
            },
            "progress_vs_goals": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "goal_title": { "type": "string" },
                  "owner": { "type": "string" },
                  "progress_percentage": { "type": "number" },
                  "status": { "enum": ["on_track", "at_risk", "off_track"] },
                  "note": { "type": "string" }
                }
              }
            },
            "risks_and_stuck_items": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "item": { "type": "string" },
                  "owner": { "type": "string" },
                  "blocker": { "type": "string" },
                  "escalation_needed": { "type": "boolean" }
                }
              }
            },
            "coaching_focus": {
              "type": "array",
              "items": { "type": "string" }
            },
            "action_items": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "task": { "type": "string" },
                  "owner": { "type": "string" },
                  "deadline": { "type": "string" },
                  "success_criteria": { "type": "string" }
                }
              }
            }
          }
        }
      }
    }
  }'::jsonb,

  -- Activation
  true,  -- is_active
  true,  -- is_enabled

  -- Schedule Config
  '{
    "type": "scheduled",
    "frequency": "weekly",
    "day_of_week": "monday",
    "time": "09:00",
    "timezone": "America/New_York",
    "enabled": true,
    "email_recipients": []
  }'::jsonb,

  -- Permissions
  'manager',  -- min_role_required

  -- Benefits
  ARRAY[
    'Automated weekly performance tracking',
    '80% reduction in manual reporting time',
    'Early identification of at-risk reps',
    'Data-driven coaching recommendations',
    'Ready-to-use WIG agendas',
    'Comprehensive cross-module analysis'
  ],

  -- Use Cases
  ARRAY[
    'Weekly team performance review',
    'Manager preparation for 1-on-1 meetings',
    'Quarterly goal progress tracking',
    'BD pipeline health monitoring',
    'Performance trend analysis',
    'Team meeting agenda generation'
  ],

  -- Creator
  (SELECT id FROM profiles WHERE email = 'admin@sjinnovation.com' LIMIT 1)
);
```

---

## Edge Function Implementation

### Primary Function: `bd-manager-weekly-review`

**Location**: `supabase/functions/bd-manager-weekly-review/index.ts`

**Purpose**:
- Query all existing data sources
- Aggregate and structure data
- Invoke OpenAI to generate analysis
- Store report in database
- Send notifications

**Function Code Structure**:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { fetchUpworkDataFromSheets } from '../_shared/fetchUpworkDataFromSheets.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authentication
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!  // Use service role for full access
    );

    // 2. Parse request
    const { weekStartDate, forceRerun, sendEmail, recipients } = await req.json();
    const weekStart = new Date(weekStartDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    console.log(`Generating BD Manager report for week: ${weekStart.toISOString()} to ${weekEnd.toISOString()}`);

    // 3. Check if report already exists
    if (!forceRerun) {
      const { data: existing } = await supabase
        .from('bd_weekly_reports')
        .select('*')
        .eq('week_start_date', weekStart.toISOString().split('T')[0])
        .single();

      if (existing) {
        return new Response(
          JSON.stringify({
            success: true,
            report_id: existing.id,
            message: 'Report already exists for this week'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 4. Fetch all data sources in parallel
    const [
      dhsData,
      eodData,
      quarterData,
      tasksData,
      upworkData
    ] = await Promise.all([
      fetchDHSData(supabase, weekStart, weekEnd),
      fetchEODData(supabase, weekStart, weekEnd),
      fetchAccountabilityData(supabase, weekStart, weekEnd),
      fetchTasksData(supabase, weekStart, weekEnd),
      fetchUpworkDataFromSheets(weekStart, weekEnd)
    ]);

    console.log('Data fetched:', {
      dhs: dhsData.submissions.length,
      eod: eodData.submissions.length,
      goals: quarterData.repGoals.length,
      tasks: tasksData.completed.length,
      upwork: upworkData.length
    });

    // 5. Build prompt with aggregated data
    const prompt = await buildPrompt(
      supabase,
      weekStart,
      weekEnd,
      dhsData,
      eodData,
      quarterData,
      tasksData,
      upworkData
    );

    // 6. Invoke OpenAI
    console.log('Invoking OpenAI for analysis...');
    const aiResponse = await invokeOpenAI(prompt);

    // 7. Parse and validate response
    const analysis = JSON.parse(aiResponse);
    validateAnalysisSchema(analysis);

    // 8. Store report
    const { data: report, error: insertError } = await supabase
      .from('bd_weekly_reports')
      .insert({
        week_start_date: weekStart.toISOString().split('T')[0],
        week_end_date: weekEnd.toISOString().split('T')[0],
        quarter: quarterData.quarter.name,
        summary: analysis.executive_summary,
        team_health_score: analysis.team_health_score,
        wig_agenda: analysis.wig_agenda,
        rep_performance: analysis.rep_performance,
        team_metrics: analysis.team_metrics,
        ai_insights: analysis.coaching_recommendations.map(r => r.suggested_action),
        risk_alerts: analysis.risks.map(r => r.description),
        coaching_recommendations: analysis.coaching_recommendations,
        generated_by: (await getAgentId(supabase)),
        report_status: 'published'
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log('Report stored successfully:', report.id);

    // 9. Send email notifications (if requested)
    if (sendEmail && recipients?.length > 0) {
      await sendReportEmail(supabase, report, recipients);
    }

    // 10. Create action items from recommendations
    await createActionItems(supabase, report, analysis);

    return new Response(
      JSON.stringify({
        success: true,
        report_id: report.id,
        summary: analysis.executive_summary,
        team_health_score: analysis.team_health_score
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('BD Manager Agent Error:', error);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// ============================================================================
// DATA FETCHING HELPERS
// ============================================================================

async function fetchDHSData(supabase, weekStart, weekEnd) {
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  // Get all DHS submissions for the week
  const { data: submissions, error } = await supabase
    .from('dhs_submissions')
    .select(`
      *,
      profiles:user_id (
        id,
        full_name,
        email
      )
    `)
    .gte('date', weekStartStr)
    .lte('date', weekEndStr)
    .order('date', { ascending: true });

  if (error) throw new Error(`DHS fetch error: ${error.message}`);

  // Get BD team members
  const { data: bdTeam } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', (
      await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'team_member')
    ).data.map(r => r.user_id));

  // Calculate aggregates
  const totalExpectedSubmissions = bdTeam.length * 5; // 5 working days
  const submissionRate = (submissions.length / totalExpectedSubmissions) * 100;

  const avgMetrics = {
    follow_ups: submissions.reduce((sum, s) => sum + s.follow_ups_done, 0) / submissions.length || 0,
    calls: submissions.reduce((sum, s) => sum + s.calls_made, 0) / submissions.length || 0,
    meetings: submissions.reduce((sum, s) => sum + s.meetings_booked, 0) / submissions.length || 0,
    pipeline_update_rate: (submissions.filter(s => s.pipeline_updated).length / submissions.length) * 100 || 0
  };

  const statusBreakdown = {
    on_track: submissions.filter(s => s.status === 'on_track').length,
    at_risk: submissions.filter(s => s.status === 'at_risk').length,
    blocked: submissions.filter(s => s.status === 'blocked').length
  };

  // Group by rep
  const byRep = submissions.reduce((acc, sub) => {
    const repId = sub.user_id;
    if (!acc[repId]) {
      acc[repId] = {
        rep_id: repId,
        rep_name: sub.profiles.full_name,
        submissions: [],
        submission_count: 0,
        avg_follow_ups: 0,
        avg_calls: 0,
        avg_meetings: 0,
        avg_score: 0,
        trend: 'stable'
      };
    }
    acc[repId].submissions.push(sub);
    acc[repId].submission_count++;
    return acc;
  }, {});

  // Calculate per-rep metrics
  Object.values(byRep).forEach((rep: any) => {
    rep.avg_follow_ups = rep.submissions.reduce((s, sub) => s + sub.follow_ups_done, 0) / rep.submission_count;
    rep.avg_calls = rep.submissions.reduce((s, sub) => s + sub.calls_made, 0) / rep.submission_count;
    rep.avg_meetings = rep.submissions.reduce((s, sub) => s + sub.meetings_booked, 0) / rep.submission_count;
    rep.avg_score = rep.submissions.reduce((s, sub) => s + (sub.score || 0), 0) / rep.submission_count;
    rep.submission_rate = (rep.submission_count / 5) * 100;

    // Calculate trend
    if (rep.submissions.length >= 3) {
      const recent = rep.submissions.slice(-2);
      const earlier = rep.submissions.slice(0, -2);
      const recentAvg = recent.reduce((s, sub) => s + (sub.score || 0), 0) / recent.length;
      const earlierAvg = earlier.reduce((s, sub) => s + (sub.score || 0), 0) / earlier.length;

      if (recentAvg > earlierAvg * 1.1) rep.trend = 'improving';
      else if (recentAvg < earlierAvg * 0.9) rep.trend = 'declining';
    }
  });

  return {
    submissions,
    submissionRate,
    totalExpected: totalExpectedSubmissions,
    avgMetrics,
    statusBreakdown,
    byRep
  };
}

async function fetchEODData(supabase, weekStart, weekEnd) {
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  const { data: submissions, error } = await supabase
    .from('eod_submissions')
    .select(`
      *,
      profiles:user_id (
        id,
        full_name,
        email
      )
    `)
    .gte('date', weekStartStr)
    .lte('date', weekEndStr)
    .order('date', { ascending: true });

  if (error) throw new Error(`EOD fetch error: ${error.message}`);

  // Get BD team size
  const { data: bdTeam } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'team_member');

  const totalExpected = bdTeam.length * 5;
  const submissionRate = (submissions.length / totalExpected) * 100;

  const totalHours = submissions.reduce((sum, s) => sum + (s.hours_worked || 0), 0);
  const avgHoursPerRep = totalHours / submissions.length || 0;

  // Extract common challenges
  const challenges = submissions
    .filter(s => s.challenges)
    .map(s => s.challenges)
    .join('\n');

  // Group by rep
  const byRep = submissions.reduce((acc, sub) => {
    const repId = sub.user_id;
    if (!acc[repId]) {
      acc[repId] = {
        rep_id: repId,
        rep_name: sub.profiles.full_name,
        submissions: [],
        total_hours: 0,
        challenges_count: 0
      };
    }
    acc[repId].submissions.push(sub);
    acc[repId].total_hours += sub.hours_worked || 0;
    if (sub.challenges) acc[repId].challenges_count++;
    return acc;
  }, {});

  return {
    submissions,
    submissionRate,
    totalExpected,
    totalHours,
    avgHoursPerRep,
    challenges,
    byRep
  };
}

async function fetchAccountabilityData(supabase, weekStart, weekEnd) {
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  // Get active quarter
  const { data: quarter, error: quarterError } = await supabase
    .from('accountability_quarters')
    .select('*')
    .eq('status', 'active')
    .single();

  if (quarterError || !quarter) {
    console.warn('No active quarter found');
    return {
      quarter: null,
      teamGoals: [],
      repGoals: [],
      activities: [],
      weeklyUpdates: [],
      blockers: []
    };
  }

  // Calculate quarter progress
  const quarterStart = new Date(quarter.start_date);
  const quarterEnd = new Date(quarter.end_date);
  const quarterTotal = quarterEnd.getTime() - quarterStart.getTime();
  const quarterElapsed = Date.now() - quarterStart.getTime();
  const quarterProgress = Math.min((quarterElapsed / quarterTotal) * 100, 100);
  const weeksRemaining = Math.ceil((quarterEnd.getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000));

  // Get team goals
  const { data: teamGoals } = await supabase
    .from('accountability_team_goals')
    .select('*')
    .eq('quarter_id', quarter.id);

  // Get rep goals with activities and weekly updates
  const { data: repGoals } = await supabase
    .from('accountability_rep_goals')
    .select(`
      *,
      profiles:rep_id (
        id,
        full_name,
        email
      ),
      accountability_activities (
        *,
        accountability_weekly_updates (*)
      )
    `)
    .eq('quarter_id', quarter.id)
    .eq('approval_status', 'approved');

  // Extract activities
  const activities = repGoals?.flatMap(g => g.accountability_activities || []) || [];

  // Get weekly updates for this week
  const { data: weeklyUpdates } = await supabase
    .from('accountability_weekly_updates')
    .select(`
      *,
      accountability_activities (
        *,
        accountability_rep_goals (
          *,
          profiles:rep_id (
            full_name
          )
        )
      )
    `)
    .gte('week_start_date', weekStartStr)
    .lte('week_end_date', weekEndStr);

  // Extract blockers
  const blockers = weeklyUpdates
    ?.filter(u => u.blockers)
    .map(u => ({
      rep_name: u.accountability_activities.accountability_rep_goals.profiles.full_name,
      activity: u.accountability_activities.title,
      blocker: u.blockers,
      help_needed: u.help_needed
    })) || [];

  return {
    quarter: {
      ...quarter,
      progress_percentage: Math.round(quarterProgress),
      weeks_remaining: weeksRemaining
    },
    teamGoals: teamGoals || [],
    repGoals: repGoals || [],
    activities,
    weeklyUpdates: weeklyUpdates || [],
    blockers
  };
}

async function fetchTasksData(supabase, weekStart, weekEnd) {
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  // Get completed tasks
  const { data: completed } = await supabase
    .from('project_tasks')
    .select(`
      *,
      profiles:assigned_to (
        id,
        full_name
      )
    `)
    .eq('status', 'completed')
    .gte('completed_at', weekStartStr)
    .lte('completed_at', weekEndStr);

  // Get in-progress tasks
  const { data: inProgress } = await supabase
    .from('project_tasks')
    .select('*')
    .eq('status', 'in_progress');

  // Get blocked tasks
  const { data: blocked } = await supabase
    .from('project_tasks')
    .select('*')
    .eq('status', 'blocked');

  const totalHours = completed?.reduce((sum, t) => sum + (t.actual_hours || 0), 0) || 0;

  // Group by rep
  const byRep = completed?.reduce((acc, task) => {
    const repId = task.assigned_to;
    if (!repId) return acc;

    if (!acc[repId]) {
      acc[repId] = {
        rep_id: repId,
        rep_name: task.profiles.full_name,
        tasks_completed: 0,
        hours_logged: 0
      };
    }
    acc[repId].tasks_completed++;
    acc[repId].hours_logged += task.actual_hours || 0;
    return acc;
  }, {}) || {};

  return {
    completed: completed || [],
    inProgress: inProgress || [],
    blocked: blocked || [],
    totalHours,
    byRep
  };
}

// ============================================================================
// PROMPT BUILDING
// ============================================================================

async function buildPrompt(
  supabase,
  weekStart,
  weekEnd,
  dhsData,
  eodData,
  quarterData,
  tasksData,
  upworkData
) {
  // Get agent config
  const { data: agent } = await supabase
    .from('ai_agents')
    .select('prompt_template, config')
    .eq('slug', 'bd-manager-weekly-review')
    .single();

  if (!agent) throw new Error('BD Manager agent not found');

  const config = agent.config;
  const targets = config.targets || {};

  // Build DHS summary
  const dhsSummary = Object.values(dhsData.byRep).map((rep: any) =>
    `${rep.rep_name}: ${rep.submission_count}/5 submissions (${rep.submission_rate.toFixed(0)}%), ` +
    `avg ${rep.avg_follow_ups.toFixed(1)} follow-ups, ${rep.avg_calls.toFixed(1)} calls, ` +
    `${rep.avg_meetings.toFixed(1)} meetings, trend: ${rep.trend}`
  ).join('\n');

  // Build EOD summary
  const eodSummary = Object.values(eodData.byRep).map((rep: any) =>
    `${rep.rep_name}: ${rep.submissions.length}/5 submissions (${(rep.submissions.length/5*100).toFixed(0)}%), ` +
    `${rep.total_hours.toFixed(1)} hours, ${rep.challenges_count} challenges reported`
  ).join('\n');

  // Build quarterly goals summary
  const teamGoalsList = quarterData.teamGoals.map(g =>
    `- ${g.title}: ${g.current_value}/${g.target_value} ${g.target_unit} (${((g.current_value/g.target_value)*100).toFixed(0)}%) - ${g.status}`
  ).join('\n');

  const repGoalsBreakdown = quarterData.repGoals.map(g =>
    `${g.profiles.full_name} - ${g.title}: ${g.current_value}/${g.target_value} ${g.target_unit} (${((g.current_value/g.target_value)*100).toFixed(0)}%) - ${g.status}`
  ).join('\n');

  const activitiesSummary = quarterData.activities.map(a =>
    `${a.title} (${a.frequency}): ${a.current_count}/${a.target_count} - ${a.status}`
  ).join('\n');

  const weeklyUpdatesSummary = quarterData.weeklyUpdates.length > 0
    ? quarterData.weeklyUpdates.map(u =>
        `Week of ${u.week_start_date}: ${u.progress_value} progress, ${u.status}` +
        (u.blockers ? ` - BLOCKER: ${u.blockers}` : '')
      ).join('\n')
    : 'No weekly updates submitted this week';

  const blockersList = quarterData.blockers.length > 0
    ? quarterData.blockers.map(b =>
        `${b.rep_name} (${b.activity}): ${b.blocker}` +
        (b.help_needed ? ` - Help needed: ${b.help_needed}` : '')
      ).join('\n')
    : 'No blockers reported';

  // Build tasks summary
  const tasksSummary = Object.values(tasksData.byRep).map((rep: any) =>
    `${rep.rep_name}: ${rep.tasks_completed} tasks, ${rep.hours_logged.toFixed(1)} hours`
  ).join('\n');

  // Build Upwork summary
  const upworkByRep = aggregateUpworkByRep(upworkData);
  const upworkSummary = Object.entries(upworkByRep).map(([repName, metrics]: [string, any]) =>
    `${repName}: ${metrics.proposals} proposals, ${metrics.invites} invites, ` +
    `${metrics.interviews} interviews, ${metrics.wins} wins, $${metrics.estimatedValue.toFixed(0)}`
  ).join('\n');

  const totalUpworkProposals = Object.values(upworkByRep).reduce((sum: number, m: any) => sum + m.proposals, 0);
  const totalUpworkInvites = Object.values(upworkByRep).reduce((sum: number, m: any) => sum + m.invites, 0);
  const totalUpworkInterviews = Object.values(upworkByRep).reduce((sum: number, m: any) => sum + m.interviews, 0);
  const totalUpworkWins = Object.values(upworkByRep).reduce((sum: number, m: any) => sum + m.wins, 0);
  const totalUpworkValue = Object.values(upworkByRep).reduce((sum: number, m: any) => sum + m.estimatedValue, 0);

  // Replace all placeholders
  let prompt = agent.prompt_template
    .replace('{{week_start_date}}', weekStart.toISOString().split('T')[0])
    .replace('{{week_end_date}}', weekEnd.toISOString().split('T')[0])
    .replace('{{quarter_name}}', quarterData.quarter?.name || 'N/A')
    .replace('{{quarter_progress_percentage}}', quarterData.quarter?.progress_percentage || 0)
    .replace('{{weeks_remaining}}', quarterData.quarter?.weeks_remaining || 0)

    // DHS placeholders
    .replace('{{dhs_summary}}', dhsSummary)
    .replace('{{dhs_submission_rate}}', dhsData.submissionRate.toFixed(1))
    .replace('{{dhs_submissions_count}}', dhsData.submissions.length)
    .replace('{{expected_dhs_submissions}}', dhsData.totalExpected)
    .replace('{{avg_follow_ups}}', dhsData.avgMetrics.follow_ups.toFixed(1))
    .replace('{{avg_calls}}', dhsData.avgMetrics.calls.toFixed(1))
    .replace('{{avg_meetings}}', dhsData.avgMetrics.meetings.toFixed(1))
    .replace('{{pipeline_update_rate}}', dhsData.avgMetrics.pipeline_update_rate.toFixed(1))
    .replace('{{dhs_on_track_count}}', dhsData.statusBreakdown.on_track)
    .replace('{{dhs_at_risk_count}}', dhsData.statusBreakdown.at_risk)
    .replace('{{dhs_blocked_count}}', dhsData.statusBreakdown.blocked)

    // EOD placeholders
    .replace('{{eod_summary}}', eodSummary)
    .replace('{{eod_submission_rate}}', eodData.submissionRate.toFixed(1))
    .replace('{{eod_submissions_count}}', eodData.submissions.length)
    .replace('{{expected_eod_submissions}}', eodData.totalExpected)
    .replace('{{total_hours_worked}}', eodData.totalHours.toFixed(1))
    .replace('{{avg_hours_per_rep}}', eodData.avgHoursPerRep.toFixed(1))
    .replace('{{top_challenges}}', eodData.challenges || 'None reported')

    // Accountability placeholders
    .replace('{{quarterly_goals_summary}}', 'See details below')
    .replace('{{team_goals_count}}', quarterData.teamGoals.length)
    .replace('{{team_goals_list}}', teamGoalsList || 'No team goals defined')
    .replace('{{rep_goals_count}}', quarterData.repGoals.length)
    .replace('{{rep_goals_breakdown}}', repGoalsBreakdown || 'No rep goals defined')
    .replace('{{activities_count}}', quarterData.activities.length)
    .replace('{{activities_summary}}', activitiesSummary || 'No activities defined')
    .replace('{{weekly_updates_count}}', quarterData.weeklyUpdates.length)
    .replace('{{weekly_updates_summary}}', weeklyUpdatesSummary)
    .replace('{{blockers_list}}', blockersList)

    // Tasks placeholders
    .replace('{{tasks_summary}}', tasksSummary || 'No tasks data')
    .replace('{{tasks_completed}}', tasksData.completed.length)
    .replace('{{tasks_in_progress}}', tasksData.inProgress.length)
    .replace('{{tasks_blocked}}', tasksData.blocked.length)
    .replace('{{tasks_hours_logged}}', tasksData.totalHours.toFixed(1))

    // Upwork placeholders
    .replace('{{upwork_summary}}', upworkSummary || 'No Upwork data')
    .replace('{{upwork_proposals}}', totalUpworkProposals)
    .replace('{{upwork_target_proposals}}', targets.upwork_proposals_per_week || 50)
    .replace('{{upwork_invites}}', totalUpworkInvites)
    .replace('{{upwork_interviews}}', totalUpworkInterviews)
    .replace('{{upwork_wins}}', totalUpworkWins)
    .replace('{{upwork_estimated_value}}', totalUpworkValue.toFixed(0))
    .replace('{{upwork_by_rep}}', upworkSummary)

    // Targets
    .replace('{{target_follow_ups}}', targets.follow_ups_per_day || 5)
    .replace('{{target_calls}}', targets.calls_per_day || 8)
    .replace('{{target_meetings}}', targets.meetings_per_week || 3);

  return prompt;
}

function aggregateUpworkByRep(upworkData) {
  // Group Upwork data by rep name
  const byRep: Record<string, any> = {};

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

// ============================================================================
// AI INVOCATION
// ============================================================================

async function invokeOpenAI(prompt: string): Promise<string> {
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
          content: 'You are a BD performance analysis expert. Provide structured, actionable insights based solely on the provided data.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 4000
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const result = await response.json();
  return result.choices[0].message.content;
}

function validateAnalysisSchema(analysis: any) {
  const required = [
    'executive_summary',
    'rep_performance',
    'team_metrics',
    'risks',
    'coaching_recommendations',
    'wig_agenda'
  ];

  for (const field of required) {
    if (!analysis[field]) {
      throw new Error(`Missing required field in AI response: ${field}`);
    }
  }

  // Validate WIG agenda structure
  const wigRequired = [
    'wins',
    'metrics_review',
    'progress_vs_goals',
    'risks_and_stuck_items',
    'coaching_focus',
    'action_items'
  ];

  for (const field of wigRequired) {
    if (!analysis.wig_agenda[field]) {
      throw new Error(`Missing required WIG agenda field: ${field}`);
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function getAgentId(supabase) {
  const { data } = await supabase
    .from('ai_agents')
    .select('id')
    .eq('slug', 'bd-manager-weekly-review')
    .single();

  return data?.id;
}

async function sendReportEmail(supabase, report, recipients) {
  // TODO: Implement email sending via SendGrid or Supabase email
  console.log('Email sending not yet implemented');
}

async function createActionItems(supabase, report, analysis) {
  const actionItems = analysis.wig_agenda.action_items || [];

  for (const item of actionItems) {
    // Find user by name
    const { data: user } = await supabase
      .from('profiles')
      .select('id')
      .ilike('full_name', `%${item.owner}%`)
      .single();

    if (user) {
      await supabase.from('project_tasks').insert({
        title: item.task,
        description: `From BD Manager Report (Week of ${report.week_start_date}):\n\n${item.success_criteria}`,
        assigned_to: user.id,
        due_date: item.deadline,
        priority: 'high',
        status: 'todo',
        category: 'work'
      });
    }
  }
}
```

**Note**: This is a comprehensive Edge Function. Create it incrementally and test each data fetching function separately.

---

## Database Schema (Minimal)

We only need **ONE new table** for storing reports. All other data comes from existing tables.

### Table: `bd_weekly_reports`

```sql
CREATE TABLE bd_weekly_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Time period
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  quarter TEXT NOT NULL,

  -- Report content
  summary TEXT NOT NULL,
  team_health_score INTEGER CHECK (team_health_score BETWEEN 0 AND 100),
  wig_agenda JSONB NOT NULL,
  rep_performance JSONB NOT NULL,
  team_metrics JSONB NOT NULL,

  -- AI insights
  ai_insights TEXT[],
  risk_alerts TEXT[],
  coaching_recommendations JSONB,

  -- Report metadata
  generated_by UUID REFERENCES ai_agents(id),
  generated_at TIMESTAMPTZ DEFAULT now(),
  report_status TEXT DEFAULT 'published' CHECK (report_status IN ('draft', 'published', 'archived')),

  -- Delivery tracking
  sent_to UUID[],
  sent_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_weekly_report UNIQUE (week_start_date)
);

CREATE INDEX idx_bd_weekly_reports_week ON bd_weekly_reports(week_start_date);
CREATE INDEX idx_bd_weekly_reports_quarter ON bd_weekly_reports(quarter);
CREATE INDEX idx_bd_weekly_reports_status ON bd_weekly_reports(report_status);

-- RLS Policy
ALTER TABLE bd_weekly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can read reports"
  ON bd_weekly_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin', 'manager')
    )
  );

CREATE POLICY "Service role can create reports"
  ON bd_weekly_reports
  FOR INSERT
  WITH CHECK (true);
```

That's it! Just one table.

---

## Report Viewer UI

### Page: `BDManagerReports.tsx`

**Location**: `/src/pages/admin/BDManagerReports.tsx`

**Purpose**: View weekly reports and WIG agendas

```typescript
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

export default function BDManagerReports() {
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);

  // Fetch all reports
  const { data: reports, isLoading } = useQuery({
    queryKey: ['bd-weekly-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bd_weekly_reports')
        .select('*')
        .eq('report_status', 'published')
        .order('week_start_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    }
  });

  // Fetch selected report details
  const { data: selectedReport } = useQuery({
    queryKey: ['bd-weekly-report', selectedWeek],
    queryFn: async () => {
      if (!selectedWeek) return null;

      const { data, error } = await supabase
        .from('bd_weekly_reports')
        .select('*')
        .eq('week_start_date', selectedWeek)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!selectedWeek
  });

  if (isLoading) return <div>Loading reports...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">BD Manager Weekly Reports</h1>
        <Button onClick={() => {/* Trigger manual run */}}>
          Generate New Report
        </Button>
      </div>

      {/* Week Selector */}
      <Card className="p-4">
        <Select
          value={selectedWeek || ''}
          onValueChange={setSelectedWeek}
        >
          <option value="">Select a week...</option>
          {reports?.map(report => (
            <option key={report.id} value={report.week_start_date}>
              Week of {report.week_start_date} - {report.week_end_date}
            </option>
          ))}
        </Select>
      </Card>

      {/* Report Display */}
      {selectedReport && (
        <div className="space-y-6">
          {/* Executive Summary */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Executive Summary</h2>
            <p className="text-lg">{selectedReport.summary}</p>
            <div className="mt-4">
              <span className="text-3xl font-bold">
                {selectedReport.team_health_score}/100
              </span>
              <span className="ml-2 text-gray-600">Team Health Score</span>
            </div>
          </Card>

          {/* Rep Performance */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Rep Performance</h2>
            <div className="space-y-4">
              {selectedReport.rep_performance.map((rep: any) => (
                <div key={rep.rep_id} className="border p-4 rounded">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{rep.rep_name}</h3>
                    <span className={`px-3 py-1 rounded text-sm ${
                      rep.overall_status === 'excellent' ? 'bg-green-100 text-green-800' :
                      rep.overall_status === 'on_track' ? 'bg-blue-100 text-blue-800' :
                      rep.overall_status === 'needs_support' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {rep.overall_status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-4 gap-2 text-sm mb-2">
                    <div>
                      <div className="text-gray-600">DHS Rate</div>
                      <div className="font-semibold">{rep.dhs_submission_rate}%</div>
                    </div>
                    <div>
                      <div className="text-gray-600">EOD Rate</div>
                      <div className="font-semibold">{rep.eod_submission_rate}%</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Goal Progress</div>
                      <div className="font-semibold">{rep.goal_progress_percentage}%</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Tasks Done</div>
                      <div className="font-semibold">{rep.tasks_completed}</div>
                    </div>
                  </div>

                  {/* Highlights */}
                  {rep.highlights?.length > 0 && (
                    <div className="mb-2">
                      <div className="text-sm font-semibold text-green-700">✓ Highlights:</div>
                      <ul className="text-sm list-disc list-inside">
                        {rep.highlights.map((h: string, i: number) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Concerns */}
                  {rep.concerns?.length > 0 && (
                    <div>
                      <div className="text-sm font-semibold text-red-700">⚠ Concerns:</div>
                      <ul className="text-sm list-disc list-inside">
                        {rep.concerns.map((c: string, i: number) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* WIG Agenda */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">WIG Agenda</h2>

            {/* Wins */}
            <div className="mb-4">
              <h3 className="font-semibold text-green-700 mb-2">🎉 Wins</h3>
              <ul className="list-disc list-inside">
                {selectedReport.wig_agenda.wins.map((win: string, i: number) => (
                  <li key={i}>{win}</li>
                ))}
              </ul>
            </div>

            {/* Metrics Review */}
            <div className="mb-4">
              <h3 className="font-semibold mb-2">📊 Metrics Review</h3>
              <div className="space-y-2">
                {selectedReport.wig_agenda.metrics_review.map((metric: any, i: number) => (
                  <div key={i} className="flex justify-between items-center border-b pb-2">
                    <span>{metric.metric}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{metric.actual}</span>
                      <span className="text-gray-500">/ {metric.target}</span>
                      <span className={
                        metric.status === 'above_target' ? 'text-green-600' :
                        metric.status === 'on_target' ? 'text-blue-600' :
                        'text-red-600'
                      }>
                        {metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '→'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Items */}
            <div>
              <h3 className="font-semibold mb-2">✅ Action Items</h3>
              <div className="space-y-2">
                {selectedReport.wig_agenda.action_items.map((item: any, i: number) => (
                  <div key={i} className="border p-3 rounded">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold">{item.task}</span>
                      <span className="text-sm text-gray-600">{item.deadline}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Owner: {item.owner} | Success: {item.success_criteria}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
```

---

## Analytics & Reporting Enhancements

- **DHS Pulse Compliance**: Surface a compliance badge (✅/⚠️) driven by the submission rate, expose a rolling heatmap for follow-ups/calls, and annotate stuck reps with blockers pulled directly from the DHS/WIG data so managers can intervene before the week exits.
- **EOD Workload Radar**: Visualize total hours, challenge density, and task velocity per rep; show variance vs the 95% submission target and highlight any reps whose weekly hours or submissions have dipped for two consecutive days.
- **Accountability + Tasks Context Cards**: Highlight the percentage of goals on track, surface blocked activities, and call out reps missing weekly updates so the admin page can trigger coaching conversations or reassignments before the quarter slips.
- **Upwork Pipeline Health**: Report proposals → win ratio, interviews booked, and revenue gaps against weekly targets; surface the Google Sheets notes the BD Manager agent recorded so leadership knows which deals are still in motion.
- **Agent Chat + Live Insights**: Embed the BD Manager agent runner so admins can ask free-form questions about rep trends, risks, or plans, and immediately see the latest summary, risks, and generated tasks returned by the agent.
- **Cross-Pillar Snapshot**: Combine DHS, EOD, Upwork, and Accountability in a single “Team Health” widget that includes week-over-week direction arrows, risk badges, and a quick list of the top 3 action items from the AI output.

## Admin Reporting Page Analytics

The refreshed `/admin/bd-reports` page mirrors the BD Manager agent’s four analytics pillars by surfacing the same metrics, thresholds, and comparative signals that drive the weekly AI review:

1. **DHS Pulse Consistency**
   - Submission rate vs. the 100% compliance goal, with follow-ups, calls, and meetings per rep summarized next to the percentage so managers can spot lags.
   - Weekly trend (improving/steady/declining) derived from the last two DHS scores and a “gap to target” callout that quantifies how far the team is from perfect coverage.
   - Context note that the data originates from the agent’s aggregated `dhs_submissions` pull and the same follow-up/call/meeting averages reported in each prompt.

2. **EOD Signal & Workload**
   - Submission rate compared to the 95% threshold, total hours logged, and completed tasks for the week, all in one card for quick workload health checks.
   - “Gap to target” text and week-over-week trend track whether coverage is slipping, while the card’s body flags hours fluctuations and challenge density sourced from `eod_submissions`.
   - Integrates the challenges narrative from the edge function so reps whose text fields include repeated blockers stand out immediately.

3. **Accountability & Tasks Progress**
   - Goal progress percentage vs. the 80% on-track benchmark, progress snippets for three prioritized goals, and linked WIG agenda notes that mention blocked activities or missing weekly updates.
   - Displays contextual coaching focus items (from `wig_agenda.progress_vs_goals`) and keeps the BD Manager agent’s action items visible so managers can correlate the AI’s recommendations with current OKRs.
   - Shows whether activities are trending toward completion and highlights when reps skip updates, matching the same fields the edge function reads from `accountability_rep_goals`, `accountability_activities`, and `accountability_weekly_updates`.

4. **Upwork Pipeline Health**
   - Proposals, wins, and a win-rate percentage that mirror the structures the edge function builds when it aggregates the Google Sheets JSON (the same data stored inside `bd_weekly_reports.team_metrics` for easy access).
   - “Gap to the weekly proposals target” plus a short note reminding managers that this data comes from the agent’s Upwork pull, so they can see pipeline throughput alongside DHS/EOD signals.
   - Pointed context on interviews booked or revenue gaps (when those fields are available) and a trend arrow that references the `week_over_week_comparison` values saved in the report.

### Live Agent Chat

The bottom of the page keeps the `AIAgentRunner` component wired to the `bd-manager-weekly-review` agent so admins can:

- Ask ad-hoc questions about a rep, trend, or risk while seeing the latest executive summary and coaching recommendations the agent generated for that week.
- Replay prior AI responses (executive summary, risks, coaching actions) without leaving the analytics page, ensuring insight requests stay anchored to the same data the cards display.
- Trigger new runs if they need a fresh interpretation of the DHS/EOD/Accountability/Upwork signals, maintaining a live conversation loop with the agent the moment new data arrives.

---

## Implementation Steps

### Phase 1: Database & Agent Setup (Week 1)

1. ✅ Create `bd_weekly_reports` table migration
2. ✅ Insert BD Manager agent record into `ai_agents` table
3. ✅ Verify agent appears on `/adminpanel/ai/agents` page
4. ✅ Test agent configuration UI

### Phase 2: Edge Function Development (Week 2)

1. ✅ Create `bd-manager-weekly-review` Edge Function
2. ✅ Implement data fetching helpers:
   - `fetchDHSData()`
   - `fetchEODData()`
   - `fetchAccountabilityData()`
   - `fetchTasksData()`
   - `fetchUpworkDataFromSheets()` (reuse from previous plan)
3. ✅ Implement prompt building logic
4. ✅ Test with OpenAI API
5. ✅ Store reports in database

### Phase 3: UI Development (Week 3)

1. ✅ Create `BDManagerReports.tsx` page
2. ✅ Add route in `App.tsx`
3. ✅ Create report viewer components
4. ✅ Add manual trigger button
5. ✅ Test report display

### Phase 4: Automation & Testing (Week 4)

1. ✅ Create `scheduled-bd-manager-weekly-review` cron function
2. ✅ Configure Supabase cron job (Monday 9 AM)
3. ✅ Implement email notifications
4. ✅ Test end-to-end flow
5. ✅ Deploy to production

---

## Testing & Deployment

### Testing Checklist

- [ ] Agent appears on `/adminpanel/ai/agents`
- [ ] Manual trigger works
- [ ] Data fetching from all 5 sources successful
- [ ] Prompt generation includes all data
- [ ] OpenAI returns valid JSON
- [ ] Report stored in database
- [ ] Report displays correctly in UI
- [ ] Cron job triggers on Monday
- [ ] Email notifications sent

### Deployment

```bash
# 1. Deploy database migration
supabase db push

# 2. Insert agent record (run SQL from AI Agent Configuration section)
# Use Supabase SQL Editor

# 3. Deploy Edge Functions
supabase functions deploy bd-manager-weekly-review
supabase functions deploy scheduled-bd-manager-weekly-review

# 4. Configure cron job (Supabase Dashboard)
# Go to Edge Functions > scheduled-bd-manager-weekly-review > Cron
# Schedule: 0 9 * * 1 (Every Monday at 9 AM)

# 5. Deploy frontend
npm run build
# Deploy to hosting
```

---

## Summary

This revised plan:

✅ **NO new data entry UI** - uses existing DHS, EOD, Accountability, Tasks, and Upwork modules
✅ **Single new table** - `bd_weekly_reports` for storing generated reports
✅ **Configured on `/adminpanel/ai/agents`** - uses existing agent management UI
✅ **Reads from 5 existing sources** - comprehensive data analysis
✅ **Automated weekly execution** - runs every Monday morning
✅ **4-week implementation** - much faster than original 8-9 weeks

**Estimated Effort**: 3-4 weeks with 1 developer

Ready to implement! 🚀

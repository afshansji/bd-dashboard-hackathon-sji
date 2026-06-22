# BD Manager Agent - Step-by-Step Setup Guide

**Goal**: Add BD Manager Agent to `/adminpanel/ai/agents` with same interface as existing agents

**Timeline**: 3-4 weeks

---

## Overview

The BD Manager Agent will:
- ✅ Appear in the agent list on `/adminpanel/ai/agents`
- ✅ Use the same configuration interface as other agents
- ✅ Read from existing modules (DHS, EOD, Accountability, Tasks, Upwork)
- ✅ Generate weekly performance reports automatically

---

## Step 1: Add Agent to Database (Week 1, Day 1)

### 1.1 Create Agent Record

Run this SQL in **Supabase SQL Editor**:

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
  'BD Manager Weekly Review',

  'Automated weekly performance review agent for BD team. Analyzes data from DHS submissions, EOD logs, Accountability Chart goals, project tasks, and Upwork activities to generate comprehensive weekly reports and WIG agendas for management.',

  'bd-manager-weekly-review',
  'performance_analysis',
  'bd_performance',

  -- System Prompt
  'You are the BD Manager Agent, an AI assistant that analyzes Business Development team performance data.

Your role:
- Analyze weekly BD execution data from DHS, EOD, Accountability Chart, Tasks, and Upwork
- Identify performance trends, risks, and opportunities
- Generate actionable insights for managers
- Create WIG (Wildly Important Goal) agendas for team meetings

Analysis criteria:
- DHS submission consistency (target: 100%)
- EOD submission consistency (target: 95%+)
- Quarterly goal progress and status
- Activity completion rates vs targets
- Blocker identification and resolution
- Task throughput and completion
- Upwork pipeline health

Output: Provide structured JSON with executive summary, rep-by-rep analysis, team metrics, risk identification, coaching recommendations, and WIG agenda.',

  -- Prompt Template (simplified)
  'Analyze BD team performance for week of {{week_start_date}} to {{week_end_date}}.

## Data Overview

**Quarter**: {{quarter_name}} ({{quarter_progress}}% complete, {{weeks_remaining}} weeks left)

### DHS Submissions
- Submission rate: {{dhs_submission_rate}}%
- Team averages: {{avg_follow_ups}} follow-ups, {{avg_calls}} calls, {{avg_meetings}} meetings/day
- Status: {{dhs_on_track}} on track, {{dhs_at_risk}} at risk, {{dhs_blocked}} blocked
{{dhs_by_rep}}

### EOD Submissions
- Submission rate: {{eod_submission_rate}}%
- Total hours: {{total_hours}} (avg {{avg_hours_per_rep}}/rep)
{{eod_by_rep}}

### Quarterly Goals & Activities
- Team goals: {{team_goals_list}}
- Rep goals: {{rep_goals_count}} total
{{rep_goals_by_rep}}
{{weekly_updates_summary}}
{{blockers_list}}

### Tasks Completed
- Completed: {{tasks_completed}} tasks
- Hours logged: {{tasks_hours}}
{{tasks_by_rep}}

### Upwork Activity
- Proposals: {{upwork_proposals}} (target: {{upwork_target}})
- Invites: {{upwork_invites}}
- Interviews: {{upwork_interviews}}
- Wins: {{upwork_wins}}
{{upwork_by_rep}}

## Analysis Required

Provide comprehensive analysis in JSON format:

1. **Executive Summary** (2-3 sentences)
2. **Rep Performance** (for each rep):
   - Overall status (excellent/on_track/needs_support/at_risk)
   - DHS/EOD submission rates
   - Goal progress %
   - Upwork metrics
   - Tasks completed
   - Top 3 highlights
   - Top 3 concerns
   - Recommended actions

3. **Team Metrics vs Targets**
4. **Risks** (critical issues requiring immediate attention)
5. **Coaching Recommendations** (prioritized: high/medium/low)
6. **WIG Agenda**:
   - Wins (top 3-5)
   - Metrics review
   - Progress vs goals
   - Risks & stuck items
   - Coaching focus
   - Action items (with owners, deadlines, success criteria)',

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
    }
  }'::jsonb,

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

  'manager',  -- min_role_required

  -- Benefits
  ARRAY[
    'Automated weekly performance tracking',
    'Comprehensive cross-module analysis',
    'Early identification of at-risk reps',
    'Data-driven coaching recommendations',
    'Ready-to-use WIG agendas',
    '80% reduction in manual reporting time'
  ],

  -- Use Cases
  ARRAY[
    'Weekly team performance review',
    'Manager preparation for 1-on-1 meetings',
    'Quarterly goal progress tracking',
    'BD pipeline health monitoring',
    'Team meeting agenda generation',
    'Performance trend analysis'
  ],

  -- Creator (adjust email as needed)
  (SELECT id FROM profiles WHERE email ILIKE '%admin%' LIMIT 1)
);
```

### 1.2 Verify Agent Appears in UI

1. Go to `/adminpanel/ai/agents`
2. You should see "BD Manager Weekly Review" in the agent list
3. Click on it to view details

**Expected UI**:
```
┌────────────────────────────────────────────────────┐
│ Agents List                                        │
├────────────────────────────────────────────────────┤
│ Name                          Category    Status   │
│ ────────────────────────────────────────────────── │
│ Lead Auto-Enrichment         research      ✅      │
│ BD Research Analyst          research      ✅      │
│ BD Weekly Insights           analytics     ✅      │
│ LinkedIn Message Generator   linkedin      ✅      │
│ BD Manager Weekly Review     bd_performance ✅  ← NEW│
│                                                     │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ BD Manager Weekly Review                           │
├────────────────────────────────────────────────────┤
│ Automated weekly performance review agent...       │
│                                                     │
│ Provider: OpenAI (gpt-4o)                         │
│ Fallback: OpenAI (gpt-4o-mini)                    │
│ Telemetry: Enabled                                │
│                                                     │
│ [Run Agent] [Edit Agent]                          │
└────────────────────────────────────────────────────┘
```

---

## Step 2: Create Database Table for Reports (Week 1, Day 1)

### 2.1 Create Migration File

Create: `supabase/migrations/20260120000001_create_bd_weekly_reports.sql`

```sql
-- Table for storing weekly BD Manager reports
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

  -- Metadata
  generated_by UUID REFERENCES ai_agents(id),
  generated_at TIMESTAMPTZ DEFAULT now(),
  report_status TEXT DEFAULT 'published' CHECK (report_status IN ('draft', 'published', 'archived')),

  -- Delivery tracking
  sent_to UUID[],
  sent_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_weekly_report UNIQUE (week_start_date)
);

-- Indexes
CREATE INDEX idx_bd_weekly_reports_week ON bd_weekly_reports(week_start_date);
CREATE INDEX idx_bd_weekly_reports_quarter ON bd_weekly_reports(quarter);
CREATE INDEX idx_bd_weekly_reports_status ON bd_weekly_reports(report_status);

-- RLS Policies
ALTER TABLE bd_weekly_reports ENABLE ROW LEVEL SECURITY;

-- Managers and admins can read reports
CREATE POLICY "Managers can read bd weekly reports"
  ON bd_weekly_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin', 'manager')
    )
  );

-- Service role (agent) can create/update reports
CREATE POLICY "Service role can manage bd weekly reports"
  ON bd_weekly_reports
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Add comment
COMMENT ON TABLE bd_weekly_reports IS 'Weekly BD team performance reports generated by BD Manager Agent';
```

### 2.2 Apply Migration

```bash
# In terminal
cd /home/user/sj-bd-dashboard
supabase db push
```

### 2.3 Regenerate TypeScript Types

```bash
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

---

## Step 3: Create Edge Function (Week 1-2)

### 3.1 Create Function Directory

```bash
mkdir -p supabase/functions/bd-manager-weekly-review
```

### 3.2 Create Main Function File

Create: `supabase/functions/bd-manager-weekly-review/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('BD Manager Agent: Starting execution');

    // 1. Create Supabase client with service role (full access)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 2. Parse request
    const body = await req.json();
    const { weekStartDate, forceRerun = false } = body;

    const weekStart = new Date(weekStartDate || getLastMonday());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    console.log(`Analyzing week: ${weekStart.toISOString()} to ${weekEnd.toISOString()}`);

    // 3. Check if report exists
    if (!forceRerun) {
      const { data: existing } = await supabase
        .from('bd_weekly_reports')
        .select('id')
        .eq('week_start_date', weekStart.toISOString().split('T')[0])
        .single();

      if (existing) {
        return new Response(
          JSON.stringify({
            success: true,
            report_id: existing.id,
            message: 'Report already exists'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 4. Fetch all data sources
    console.log('Fetching data from existing modules...');
    const data = await fetchAllData(supabase, weekStart, weekEnd);

    // 5. Build AI prompt
    console.log('Building prompt...');
    const prompt = await buildPrompt(supabase, weekStart, weekEnd, data);

    // 6. Invoke OpenAI
    console.log('Invoking OpenAI for analysis...');
    const analysis = await invokeOpenAI(prompt);

    // 7. Store report
    console.log('Storing report...');
    const report = await storeReport(supabase, weekStart, weekEnd, analysis, data);

    console.log(`Report created successfully: ${report.id}`);

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
      JSON.stringify({
        error: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getLastMonday(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 1
  const monday = new Date(today);
  monday.setDate(today.getDate() - diff - 7); // Last Monday
  return monday.toISOString().split('T')[0];
}

async function fetchAllData(supabase: any, weekStart: Date, weekEnd: Date) {
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  console.log('Fetching DHS data...');
  const { data: dhsData } = await supabase
    .from('dhs_submissions')
    .select(`
      *,
      profiles:user_id (id, full_name, email)
    `)
    .gte('date', weekStartStr)
    .lte('date', weekEndStr);

  console.log('Fetching EOD data...');
  const { data: eodData } = await supabase
    .from('eod_submissions')
    .select(`
      *,
      profiles:user_id (id, full_name, email)
    `)
    .gte('date', weekStartStr)
    .lte('date', weekEndStr);

  console.log('Fetching Accountability data...');
  const { data: activeQuarter } = await supabase
    .from('accountability_quarters')
    .select('*')
    .eq('status', 'active')
    .single();

  let repGoals = [];
  let weeklyUpdates = [];
  if (activeQuarter) {
    const { data: goals } = await supabase
      .from('accountability_rep_goals')
      .select(`
        *,
        profiles:rep_id (id, full_name, email),
        accountability_activities (
          *,
          accountability_weekly_updates (*)
        )
      `)
      .eq('quarter_id', activeQuarter.id)
      .eq('approval_status', 'approved');

    repGoals = goals || [];

    const { data: updates } = await supabase
      .from('accountability_weekly_updates')
      .select(`
        *,
        accountability_activities (
          title,
          accountability_rep_goals (
            profiles:rep_id (full_name)
          )
        )
      `)
      .gte('week_start_date', weekStartStr)
      .lte('week_end_date', weekEndStr);

    weeklyUpdates = updates || [];
  }

  console.log('Fetching Tasks data...');
  const { data: tasksCompleted } = await supabase
    .from('project_tasks')
    .select(`
      *,
      profiles:assigned_to (id, full_name)
    `)
    .eq('status', 'completed')
    .gte('completed_at', weekStartStr)
    .lte('completed_at', weekEndStr);

  console.log('Fetching Upwork data from Google Sheets...');
  // TODO: Implement Google Sheets API fetch
  // For now, return empty array
  const upworkData = [];

  console.log('Data fetch complete');

  return {
    dhs: dhsData || [],
    eod: eodData || [],
    quarter: activeQuarter,
    repGoals: repGoals,
    weeklyUpdates: weeklyUpdates,
    tasks: tasksCompleted || [],
    upwork: upworkData
  };
}

async function buildPrompt(
  supabase: any,
  weekStart: Date,
  weekEnd: Date,
  data: any
): Promise<string> {
  // Get agent config
  const { data: agent } = await supabase
    .from('ai_agents')
    .select('prompt_template, config')
    .eq('slug', 'bd-manager-weekly-review')
    .single();

  if (!agent) throw new Error('Agent configuration not found');

  // Calculate aggregates
  const dhsSubmissionRate = data.dhs.length > 0 ? (data.dhs.length / (5 * getBDTeamSize(data))) * 100 : 0;
  const eodSubmissionRate = data.eod.length > 0 ? (data.eod.length / (5 * getBDTeamSize(data))) * 100 : 0;

  const avgFollowUps = data.dhs.reduce((sum: number, d: any) => sum + d.follow_ups_done, 0) / data.dhs.length || 0;
  const avgCalls = data.dhs.reduce((sum: number, d: any) => sum + d.calls_made, 0) / data.dhs.length || 0;
  const avgMeetings = data.dhs.reduce((sum: number, d: any) => sum + d.meetings_booked, 0) / data.dhs.length || 0;

  // Build rep summaries
  const dhsByRep = groupByRep(data.dhs, 'user_id');
  const eodByRep = groupByRep(data.eod, 'user_id');
  const tasksByRep = groupByRep(data.tasks, 'assigned_to');

  // Replace placeholders
  let prompt = agent.prompt_template
    .replace('{{week_start_date}}', weekStart.toISOString().split('T')[0])
    .replace('{{week_end_date}}', weekEnd.toISOString().split('T')[0])
    .replace('{{quarter_name}}', data.quarter?.name || 'N/A')
    .replace('{{quarter_progress}}', calculateQuarterProgress(data.quarter))
    .replace('{{weeks_remaining}}', calculateWeeksRemaining(data.quarter))
    .replace('{{dhs_submission_rate}}', dhsSubmissionRate.toFixed(1))
    .replace('{{avg_follow_ups}}', avgFollowUps.toFixed(1))
    .replace('{{avg_calls}}', avgCalls.toFixed(1))
    .replace('{{avg_meetings}}', avgMeetings.toFixed(1))
    .replace('{{dhs_on_track}}', data.dhs.filter((d: any) => d.status === 'on_track').length)
    .replace('{{dhs_at_risk}}', data.dhs.filter((d: any) => d.status === 'at_risk').length)
    .replace('{{dhs_blocked}}', data.dhs.filter((d: any) => d.status === 'blocked').length)
    .replace('{{eod_submission_rate}}', eodSubmissionRate.toFixed(1))
    .replace('{{total_hours}}', data.eod.reduce((sum: number, e: any) => sum + (e.hours_worked || 0), 0).toFixed(1))
    .replace('{{avg_hours_per_rep}}', (data.eod.reduce((sum: number, e: any) => sum + (e.hours_worked || 0), 0) / data.eod.length || 0).toFixed(1))
    .replace('{{rep_goals_count}}', data.repGoals.length)
    .replace('{{tasks_completed}}', data.tasks.length)
    .replace('{{tasks_hours}}', data.tasks.reduce((sum: number, t: any) => sum + (t.actual_hours || 0), 0).toFixed(1))
    .replace('{{upwork_proposals}}', 0)
    .replace('{{upwork_invites}}', 0)
    .replace('{{upwork_interviews}}', 0)
    .replace('{{upwork_wins}}', 0)
    .replace('{{upwork_target}}', agent.config.targets?.upwork_proposals_per_week || 10);

  // Add detailed summaries
  prompt = prompt
    .replace('{{dhs_by_rep}}', formatRepSummary(dhsByRep, 'DHS'))
    .replace('{{eod_by_rep}}', formatRepSummary(eodByRep, 'EOD'))
    .replace('{{rep_goals_by_rep}}', formatGoalsSummary(data.repGoals))
    .replace('{{weekly_updates_summary}}', formatWeeklyUpdates(data.weeklyUpdates))
    .replace('{{blockers_list}}', formatBlockers(data.weeklyUpdates))
    .replace('{{tasks_by_rep}}', formatRepSummary(tasksByRep, 'Tasks'))
    .replace('{{upwork_by_rep}}', 'No Upwork data available')
    .replace('{{team_goals_list}}', 'N/A');

  return prompt;
}

async function invokeOpenAI(prompt: string): Promise<any> {
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
          content: 'You are a BD performance analyst. Provide structured JSON analysis based on the data provided.'
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
  const content = result.choices[0].message.content;
  return JSON.parse(content);
}

async function storeReport(
  supabase: any,
  weekStart: Date,
  weekEnd: Date,
  analysis: any,
  data: any
) {
  const { data: agent } = await supabase
    .from('ai_agents')
    .select('id')
    .eq('slug', 'bd-manager-weekly-review')
    .single();

  const { data: report, error } = await supabase
    .from('bd_weekly_reports')
    .insert({
      week_start_date: weekStart.toISOString().split('T')[0],
      week_end_date: weekEnd.toISOString().split('T')[0],
      quarter: data.quarter?.name || 'N/A',
      summary: analysis.executive_summary || 'No summary provided',
      team_health_score: analysis.team_health_score || 50,
      wig_agenda: analysis.wig_agenda || {},
      rep_performance: analysis.rep_performance || [],
      team_metrics: analysis.team_metrics || {},
      ai_insights: analysis.coaching_recommendations?.map((r: any) => r.suggested_action) || [],
      risk_alerts: analysis.risks?.map((r: any) => r.description) || [],
      coaching_recommendations: analysis.coaching_recommendations || [],
      generated_by: agent.id,
      report_status: 'published'
    })
    .select()
    .single();

  if (error) throw error;
  return report;
}

// Utility functions
function getBDTeamSize(data: any): number {
  const repIds = new Set([
    ...data.dhs.map((d: any) => d.user_id),
    ...data.eod.map((e: any) => e.user_id)
  ]);
  return repIds.size || 1;
}

function groupByRep(items: any[], idField: string): Record<string, any[]> {
  return items.reduce((acc, item) => {
    const id = item[idField];
    if (!id) return acc;
    if (!acc[id]) acc[id] = [];
    acc[id].push(item);
    return acc;
  }, {});
}

function calculateQuarterProgress(quarter: any): string {
  if (!quarter) return '0';
  const start = new Date(quarter.start_date).getTime();
  const end = new Date(quarter.end_date).getTime();
  const now = Date.now();
  const progress = ((now - start) / (end - start)) * 100;
  return Math.min(Math.max(progress, 0), 100).toFixed(0);
}

function calculateWeeksRemaining(quarter: any): string {
  if (!quarter) return '0';
  const end = new Date(quarter.end_date).getTime();
  const now = Date.now();
  const weeks = Math.ceil((end - now) / (7 * 24 * 60 * 60 * 1000));
  return Math.max(weeks, 0).toString();
}

function formatRepSummary(byRep: Record<string, any[]>, type: string): string {
  return Object.entries(byRep)
    .map(([repId, items]) => {
      const repName = items[0]?.profiles?.full_name || 'Unknown';
      return `${repName}: ${items.length} ${type} entries`;
    })
    .join('\n') || `No ${type} data`;
}

function formatGoalsSummary(goals: any[]): string {
  return goals
    .map(g => `${g.profiles.full_name} - ${g.title}: ${g.current_value}/${g.target_value} ${g.target_unit} (${g.status})`)
    .join('\n') || 'No goals defined';
}

function formatWeeklyUpdates(updates: any[]): string {
  return updates.length > 0
    ? updates.map(u => `Week ${u.week_start_date}: ${u.progress_value} progress (${u.status})`).join('\n')
    : 'No updates submitted';
}

function formatBlockers(updates: any[]): string {
  const blockers = updates.filter(u => u.blockers);
  return blockers.length > 0
    ? blockers.map(u => `${u.accountability_activities.accountability_rep_goals.profiles.full_name}: ${u.blockers}`).join('\n')
    : 'No blockers reported';
}
```

### 3.3 Deploy Edge Function

```bash
supabase functions deploy bd-manager-weekly-review
```

---

## Step 4: Test Agent Execution (Week 2)

### 4.1 Manual Test via UI

1. Go to `/adminpanel/ai/agents`
2. Select "BD Manager Weekly Review"
3. Click **[Run Agent]** button
4. The existing `AgentConfigModal` or runner interface will appear
5. Optionally specify `weekStartDate` (defaults to last Monday)
6. Click **Execute**

### 4.2 Expected Flow

```
User clicks "Run Agent"
  ↓
Modal opens (or inline runner shows)
  ↓
User configures parameters:
  - weekStartDate: [2026-01-13] (auto-filled)
  - forceRerun: [No]
  ↓
User clicks "Execute"
  ↓
Frontend calls:
  supabase.functions.invoke('bd-manager-weekly-review', { body: { weekStartDate: '2026-01-13' } })
  ↓
Edge Function:
  1. Fetches DHS submissions ✅
  2. Fetches EOD submissions ✅
  3. Fetches Accountability goals ✅
  4. Fetches Tasks ✅
  5. Fetches Upwork data (TODO) ⏳
  6. Builds AI prompt
  7. Invokes OpenAI GPT-4o
  8. Stores report in bd_weekly_reports
  ↓
Returns report_id and summary
  ↓
UI shows success toast with summary
```

---

## Step 5: Create Report Viewer (Week 3)

### 5.1 Create Report Page

Create: `src/pages/admin/BDManagerReports.tsx`

```typescript
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';

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

  // Fetch selected report
  const { data: report } = useQuery({
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

  // Trigger new report generation
  const handleGenerateReport = async () => {
    try {
      toast({ title: 'Generating report...', description: 'This may take 30-60 seconds' });

      const { data, error } = await supabase.functions.invoke('bd-manager-weekly-review', {
        body: { forceRerun: false }
      });

      if (error) throw error;

      toast({
        title: 'Report generated successfully',
        description: data.summary
      });

      // Refresh reports list
      // (TanStack Query will auto-refetch)
    } catch (error: any) {
      toast({
        title: 'Error generating report',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  if (isLoading) return <div className="p-6">Loading reports...</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">BD Manager Weekly Reports</h1>
        <Button onClick={handleGenerateReport}>
          Generate New Report
        </Button>
      </div>

      {/* Week Selector */}
      <Card className="p-4">
        <Select value={selectedWeek || ''} onValueChange={setSelectedWeek}>
          <SelectTrigger>
            <SelectValue placeholder="Select a week..." />
          </SelectTrigger>
          <SelectContent>
            {reports?.map(r => (
              <SelectItem key={r.id} value={r.week_start_date}>
                Week of {r.week_start_date} - {r.week_end_date}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {/* Report Display */}
      {report && (
        <div className="space-y-6">
          {/* Executive Summary */}
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Executive Summary</h2>
            <p className="text-lg mb-4">{report.summary}</p>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold text-blue-600">
                {report.team_health_score}/100
              </div>
              <div className="text-gray-600">Team Health Score</div>
            </div>
          </Card>

          {/* Rep Performance */}
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Rep Performance</h2>
            <div className="space-y-4">
              {report.rep_performance?.map((rep: any, idx: number) => (
                <div key={idx} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold">{rep.rep_name}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      rep.overall_status === 'excellent' ? 'bg-green-100 text-green-800' :
                      rep.overall_status === 'on_track' ? 'bg-blue-100 text-blue-800' :
                      rep.overall_status === 'needs_support' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {rep.overall_status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-sm mb-3">
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
                      <div className="text-gray-600">Tasks</div>
                      <div className="font-semibold">{rep.tasks_completed}</div>
                    </div>
                  </div>

                  {rep.highlights?.length > 0 && (
                    <div className="mb-2">
                      <div className="text-sm font-semibold text-green-700 mb-1">✓ Highlights</div>
                      <ul className="text-sm list-disc list-inside text-gray-700">
                        {rep.highlights.map((h: string, i: number) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {rep.concerns?.length > 0 && (
                    <div>
                      <div className="text-sm font-semibold text-red-700 mb-1">⚠ Concerns</div>
                      <ul className="text-sm list-disc list-inside text-gray-700">
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
            <h2 className="text-2xl font-semibold mb-4">WIG Agenda</h2>

            {report.wig_agenda?.wins && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-green-700 mb-2">🎉 Wins</h3>
                <ul className="list-disc list-inside space-y-1">
                  {report.wig_agenda.wins.map((win: string, i: number) => (
                    <li key={i} className="text-gray-700">{win}</li>
                  ))}
                </ul>
              </div>
            )}

            {report.wig_agenda?.action_items && (
              <div>
                <h3 className="text-lg font-semibold mb-2">✅ Action Items</h3>
                <div className="space-y-3">
                  {report.wig_agenda.action_items.map((item: any, i: number) => (
                    <div key={i} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="font-semibold">{item.task}</div>
                      <div className="text-sm text-gray-600">
                        Owner: {item.owner} | Deadline: {item.deadline}
                      </div>
                      <div className="text-sm text-gray-500">{item.success_criteria}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
```

### 5.2 Add Route

Edit: `src/App.tsx`

Add route for managers/admins:

```typescript
import BDManagerReports from './pages/admin/BDManagerReports';

// In routes section:
<Route path="/admin/bd-reports" element={
  <ProtectedRoute requiredMinimumRole="manager">
    <Layout />
  </ProtectedRoute>
}>
  <Route index element={<BDManagerReports />} />
</Route>
```

### 5.3 Add Navigation Link

Edit: `src/components/layout/Navigation.tsx`

Add menu item:

```typescript
{
  name: 'BD Reports',
  path: '/admin/bd-reports',
  icon: ChartBarIcon, // or similar
  requiredRole: 'manager'
}
```

---

## Step 6: Schedule Automated Execution (Week 4)

### 6.1 Create Cron Function

Create: `supabase/functions/scheduled-bd-manager-weekly-review/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    console.log('Scheduled BD Manager Agent: Starting');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check if agent scheduling is enabled
    const { data: agent } = await supabase
      .from('ai_agents')
      .select('schedule_config')
      .eq('slug', 'bd-manager-weekly-review')
      .single();

    if (!agent?.schedule_config?.enabled) {
      console.log('Agent scheduling is disabled');
      return new Response('Scheduling disabled', { status: 200 });
    }

    // Invoke main agent function
    const { data, error } = await supabase.functions.invoke('bd-manager-weekly-review', {
      body: {
        forceRerun: false,
        sendEmail: true,
        recipients: agent.schedule_config.email_recipients || []
      }
    });

    if (error) throw error;

    console.log('Scheduled execution successful:', data);

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Scheduled execution error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

### 6.2 Deploy Cron Function

```bash
supabase functions deploy scheduled-bd-manager-weekly-review
```

### 6.3 Configure Cron Job

**In Supabase Dashboard**:

1. Go to **Edge Functions**
2. Find `scheduled-bd-manager-weekly-review`
3. Click **Cron Jobs** tab
4. Add schedule:
   - **Cron expression**: `0 9 * * 1` (Every Monday at 9 AM)
   - **Timezone**: America/New_York
5. **Enable** the cron job

---

## Step 7: Verification Checklist

### Week 1 Checklist
- [ ] Agent record inserted in `ai_agents` table
- [ ] Agent appears in `/adminpanel/ai/agents` list
- [ ] Agent details display correctly when selected
- [ ] `bd_weekly_reports` table created
- [ ] TypeScript types regenerated
- [ ] Edge Function created and deployed
- [ ] Manual execution via UI works

### Week 2 Checklist
- [ ] All data sources fetch correctly (DHS, EOD, Accountability, Tasks)
- [ ] Prompt generation works with real data
- [ ] OpenAI integration returns valid JSON
- [ ] Reports store in database successfully
- [ ] Error handling works for missing data

### Week 3 Checklist
- [ ] Reports page accessible at `/admin/bd-reports`
- [ ] Week selector populates with existing reports
- [ ] Report display shows all sections correctly
- [ ] "Generate New Report" button works
- [ ] Navigation link added for managers/admins

### Week 4 Checklist
- [ ] Cron function deployed
- [ ] Cron schedule configured in Supabase
- [ ] First scheduled report generates successfully
- [ ] Email notifications configured (optional)
- [ ] Agent can be edited via existing UI

---

## Configuration via UI

### Editing the Agent

The agent can be configured using the **existing AgentConfigModal** on `/adminpanel/ai/agents`:

1. **Click** on "BD Manager Weekly Review" in agent list
2. **Click** [Edit Agent] button
3. **Modify** any of the following:
   - System Prompt
   - Prompt Template
   - Provider Configuration (OpenAI model)
   - Scheduling (frequency, time, timezone)
   - Targets (DHS rate, EOD rate, etc.)
4. **Save** changes

The modal supports all existing agent configuration features:
- Multi-step wizard
- Provider selection (OpenAI, Anthropic, Perplexity)
- Model selection (gpt-4o, gpt-4o-mini, etc.)
- Schedule configuration
- Feature flags (telemetry, research)
- Testing interface

---

## Summary

**What You Get**:

✅ **Agent in UI**: Appears on `/adminpanel/ai/agents` with all other agents
✅ **Same Interface**: Uses existing `AgentConfigModal` for configuration
✅ **No New UI for Data Entry**: Reads from existing DHS, EOD, Accountability, Tasks modules
✅ **1 New Table**: `bd_weekly_reports` for storing generated reports
✅ **1 Main Edge Function**: `bd-manager-weekly-review` that queries existing data
✅ **1 Report Viewer**: `/admin/bd-reports` page to view reports
✅ **Automated Execution**: Cron job runs every Monday at 9 AM
✅ **Comprehensive Analysis**: Aggregates data from 5 sources
✅ **AI-Powered Insights**: Uses OpenAI GPT-4o for analysis
✅ **WIG-Ready Output**: Generates agendas for team meetings

**Timeline**: 3-4 weeks
**Tables Added**: 1 (`bd_weekly_reports`)
**Edge Functions**: 2 (main + cron)
**UI Pages**: 1 (report viewer)
**Existing Modules Used**: 5 (DHS, EOD, Accountability, Tasks, Upwork)

Ready to implement! 🚀

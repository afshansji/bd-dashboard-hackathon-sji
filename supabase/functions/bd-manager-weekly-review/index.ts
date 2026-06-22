import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('BD Manager Agent: Starting execution');

    // Create Supabase client with service role (full access)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Parse request
    const body = await req.json();
    const { weekStartDate, forceRerun = false } = body;

    const weekStart = new Date(weekStartDate || getLastMonday());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    console.log(`Analyzing week: ${weekStart.toISOString()} to ${weekEnd.toISOString()}`);

    // Check if report exists
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

    // Fetch all data sources
    console.log('Fetching data from existing modules...');
    const data = await fetchAllData(supabase, weekStart, weekEnd);

    // Build AI prompt
    console.log('Building prompt...');
    const prompt = await buildPrompt(supabase, weekStart, weekEnd, data);

    // Invoke Lovable AI (using gateway)
    console.log('Invoking AI for analysis...');
    const analysis = await invokeAI(prompt);

    // Store report
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

  } catch (error: unknown) {
    console.error('BD Manager Agent Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return new Response(
      JSON.stringify({
        error: errorMessage,
        stack: errorStack
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
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - diff - 7);
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

  let repGoals: any[] = [];
  let weeklyUpdates: any[] = [];
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

  console.log('Data fetch complete');

  return {
    dhs: dhsData || [],
    eod: eodData || [],
    quarter: activeQuarter,
    repGoals: repGoals,
    weeklyUpdates: weeklyUpdates,
    tasks: tasksCompleted || [],
    upwork: []
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
  const teamSize = getBDTeamSize(data);
  const dhsSubmissionRate = data.dhs.length > 0 ? (data.dhs.length / (5 * teamSize)) * 100 : 0;
  const eodSubmissionRate = data.eod.length > 0 ? (data.eod.length / (5 * teamSize)) * 100 : 0;

  // Build rep summaries
  const dhsByRep = groupByRep(data.dhs, 'user_id');
  const eodByRep = groupByRep(data.eod, 'user_id');
  const tasksByRep = groupByRep(data.tasks, 'assigned_to');

  const targets = agent.config?.targets || {};

  // Replace placeholders
  let prompt = agent.prompt_template
    .replace('{{week_start_date}}', weekStart.toISOString().split('T')[0])
    .replace('{{week_end_date}}', weekEnd.toISOString().split('T')[0])
    .replace('{{quarter_name}}', data.quarter?.name || 'N/A')
    .replace('{{quarter_progress}}', calculateQuarterProgress(data.quarter))
    .replace('{{weeks_remaining}}', calculateWeeksRemaining(data.quarter))
    .replace('{{dhs_submission_rate}}', dhsSubmissionRate.toFixed(1))
    .replace('{{dhs_total_entries}}', String(data.dhs.length))
    .replace('{{eod_submission_rate}}', eodSubmissionRate.toFixed(1))
    .replace('{{total_hours}}', data.eod.reduce((sum: number, e: any) => sum + (e.hours_worked || 0), 0).toFixed(1))
    .replace('{{avg_hours_per_rep}}', (data.eod.length > 0 ? data.eod.reduce((sum: number, e: any) => sum + (e.hours_worked || 0), 0) / data.eod.length : 0).toFixed(1))
    .replace('{{rep_goals_count}}', String(data.repGoals.length))
    .replace('{{tasks_completed}}', String(data.tasks.length))
    .replace('{{tasks_hours}}', data.tasks.reduce((sum: number, t: any) => sum + (t.actual_hours || 0), 0).toFixed(1))
    .replace('{{upwork_proposals}}', '0')
    .replace('{{upwork_invites}}', '0')
    .replace('{{upwork_interviews}}', '0')
    .replace('{{upwork_wins}}', '0')
    .replace('{{upwork_target}}', String(targets.upwork_proposals_per_week || 10));

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

async function invokeAI(prompt: string): Promise<any> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    throw new Error('LOVABLE_API_KEY is not configured');
  }

  // Use Lovable AI Gateway
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: 'You are a BD performance analyst. Provide structured JSON analysis based on the data provided. Return valid JSON with executive_summary, team_health_score (0-100), rep_performance (array), team_metrics (object), risks (array), coaching_recommendations (array), and wig_agenda (object).'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 4000
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI API error: ${error}`);
  }

  const result = await response.json();
  const content = result.choices[0].message.content;
  
  // Parse JSON from response (handle markdown code blocks)
  let jsonStr = content;
  if (content.includes('```json')) {
    jsonStr = content.split('```json')[1].split('```')[0].trim();
  } else if (content.includes('```')) {
    jsonStr = content.split('```')[1].split('```')[0].trim();
  }
  
  return JSON.parse(jsonStr);
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
      ai_insights: analysis.coaching_recommendations?.map((r: any) => r.suggested_action || r.action || String(r)) || [],
      risk_alerts: analysis.risks?.map((r: any) => r.description || String(r)) || [],
      coaching_recommendations: analysis.coaching_recommendations || [],
      generated_by: agent?.id || null,
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
    .map(([_repId, items]) => {
      const repName = items[0]?.profiles?.full_name || 'Unknown';
      return `${repName}: ${items.length} ${type} entries`;
    })
    .join('\n') || `No ${type} data`;
}

function formatGoalsSummary(goals: any[]): string {
  return goals
    .map(g => `${g.profiles?.full_name || 'Unknown'} - ${g.title}: ${g.current_value}/${g.target_value} ${g.target_unit} (${g.status})`)
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
    ? blockers.map(u => {
        const repName = u.accountability_activities?.accountability_rep_goals?.profiles?.full_name || 'Unknown';
        return `${repName}: ${u.blockers}`;
      }).join('\n')
    : 'No blockers reported';
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EODSubmission {
  id: string;
  user_id: string;
  submission_date: string;
  task_links: string[];
  notes: string | null;
}

interface TaskData {
  external_task_id: string;
  task_name: string;
  status: string;
  last_comment: string | null;
  hours_logged: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Generate EOD Summary: Request received');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get date from request or use today
    const { date } = await req.json();
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    console.log(`Processing summaries for date: ${targetDate}`);

    // Fetch all EOD submissions for the target date
    const { data: submissions, error: submissionsError } = await supabase
      .from('team_eod_submissions')
      .select(`
        *,
        users:user_id (
          id,
          email,
          first_name,
          last_name,
          role,
          title
        )
      `)
      .eq('submission_date', targetDate);

    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
      throw submissionsError;
    }

    if (!submissions || submissions.length === 0) {
      console.log('No submissions found for this date');
      return new Response(
        JSON.stringify({ 
          message: 'No submissions found for this date',
          summaries_generated: 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${submissions.length} submissions to process`);

    let summariesGenerated = 0;

    // Process each submission
    for (const submission of submissions) {
      try {
        const user = submission.users;
        if (!user) continue;

        // Extract task IDs from task links
        const taskIds = submission.task_links
          .map((link: string) => {
            const match = link.match(/AC-(\d+)/i);
            return match ? `AC-${match[1]}` : null;
          })
          .filter(Boolean);

        // Fetch task data for these tasks
        const { data: tasks } = await supabase
          .from('activecollab_task_data')
          .select('*')
          .in('external_task_id', taskIds)
          .eq('sync_date', targetDate);

        const tasksData = tasks || [];

        // Calculate metrics
        const tasksCompleted = tasksData.filter(t => t.status === 'completed').length;
        const totalHours = tasksData.reduce((sum, t) => sum + (t.hours_logged || 0), 0);

        // Build context for AI
        const context = {
          user: {
            name: `${user.first_name} ${user.last_name}`,
            role: user.role,
            title: user.title,
          },
          date: targetDate,
          tasks: tasksData.map(t => ({
            name: t.task_name,
            status: t.status,
            hours: t.hours_logged,
            comment: t.last_comment,
          })),
          notes: submission.notes,
          metrics: {
            tasks_completed: tasksCompleted,
            hours_logged: totalHours,
            total_tasks: tasksData.length,
          },
        };

        // Generate AI summary using OpenAI
        const prompt = `You are an assistant manager analyzing daily work reports.

Team Member: ${context.user.name}
Role: ${context.user.role}
Date: ${targetDate}

Tasks Reported (${context.metrics.total_tasks} total):
${context.tasks.map(t => `
- Task: ${t.name}
  Status: ${t.status}
  Hours: ${t.hours}
  ${t.comment ? `Comment: ${t.comment}` : ''}
`).join('\n')}

Notes from team member: ${context.notes || 'None'}

Summary Metrics:
- Tasks completed: ${context.metrics.tasks_completed}
- Hours logged: ${context.metrics.hours_logged}

Analyze this EOD report and provide:
1. A brief overall summary (2-3 sentences)
2. Key accomplishments (3-5 bullet points)
3. A productivity score from 0-100 with brief justification
4. Any concerns or blockers identified
5. Recommendations for the manager
6. Brief hours utilization analysis

Respond in JSON format:
{
  "overall_summary": "string",
  "key_accomplishments": ["string"],
  "productivity_score": number,
  "productivity_justification": "string",
  "concerns": ["string"],
  "recommendations": ["string"],
  "hours_analysis": "string"
}`;

        console.log(`Calling OpenAI for user ${user.id}`);

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are an assistant manager who analyzes team member work reports. Provide constructive, professional feedback in JSON format.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
          }),
        });

        if (!openaiResponse.ok) {
          const errorText = await openaiResponse.text();
          console.error(`OpenAI API error for user ${user.id}:`, errorText);
          throw new Error(`OpenAI API error: ${errorText}`);
        }

        const openaiData = await openaiResponse.json();
        const aiAnalysis = JSON.parse(openaiData.choices[0].message.content);

        console.log(`Generated summary for user ${user.id}`);

        // Store the summary in the database
        const { error: summaryError } = await supabase
          .from('team_daily_summaries')
          .upsert({
            user_id: user.id,
            summary_date: targetDate,
            ai_summary: aiAnalysis,
            tasks_completed: tasksCompleted,
            hours_logged: totalHours,
            productivity_score: aiAnalysis.productivity_score,
            key_accomplishments: aiAnalysis.key_accomplishments || [],
            concerns: aiAnalysis.concerns || [],
            eod_submission_id: submission.id,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,summary_date',
          });

        if (summaryError) {
          console.error(`Error storing summary for user ${user.id}:`, summaryError);
          throw summaryError;
        }

        summariesGenerated++;
        console.log(`Successfully stored summary for user ${user.id}`);

      } catch (userError) {
        console.error(`Error processing submission for user ${submission.user_id}:`, userError);
        // Continue with next user instead of failing completely
      }
    }

    console.log(`Summary generation complete: ${summariesGenerated} summaries generated`);

    return new Response(
      JSON.stringify({
        message: 'Summary generation completed',
        date: targetDate,
        submissions_processed: submissions.length,
        summaries_generated: summariesGenerated,
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: unknown) {
    console.error('Error in generate-eod-summary:', error);
    const err = error as Error;
    return new Response(
      JSON.stringify({ 
        error: err.message,
        details: 'Check function logs for more information'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

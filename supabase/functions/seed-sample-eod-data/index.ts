import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Seeding sample EOD data...');

    // Get current user (for testing, we'll use the authenticated user)
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get some users from the database
    const { data: users } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .limit(5);

    if (!users || users.length === 0) {
      throw new Error('No users found in database');
    }

    // Get some projects from the database
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, external_project_id')
      .limit(3);

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    console.log(`Using ${users.length} users and ${projects?.length || 0} projects`);

    // Sample task data
    const sampleTasks = [
      {
        external_task_id: 'AC-1001',
        task_name: 'Implement user authentication flow',
        status: 'completed',
        last_comment: 'Successfully implemented OAuth integration with Google. All tests passing.',
        hours_logged: 6.5,
      },
      {
        external_task_id: 'AC-1002',
        task_name: 'Design dashboard mockups',
        status: 'completed',
        last_comment: 'Completed all mockups for manager dashboard. Ready for review.',
        hours_logged: 4.0,
      },
      {
        external_task_id: 'AC-1003',
        task_name: 'Fix bug in payment processing',
        status: 'in_progress',
        last_comment: 'Identified root cause. Working on the fix. Should be done by EOD tomorrow.',
        hours_logged: 3.5,
      },
      {
        external_task_id: 'AC-1004',
        task_name: 'Update API documentation',
        status: 'completed',
        last_comment: 'All endpoints documented with examples. Updated Swagger UI.',
        hours_logged: 2.5,
      },
      {
        external_task_id: 'AC-1005',
        task_name: 'Code review for PR #234',
        status: 'completed',
        last_comment: 'Reviewed and approved. Left some minor suggestions for improvement.',
        hours_logged: 1.5,
      },
      {
        external_task_id: 'AC-1006',
        task_name: 'Database optimization',
        status: 'in_progress',
        last_comment: 'Added indexes on frequently queried columns. Performance improved by 40%.',
        hours_logged: 5.0,
      },
      {
        external_task_id: 'AC-1007',
        task_name: 'Client meeting preparation',
        status: 'completed',
        last_comment: 'Prepared presentation deck and demo environment. Ready for tomorrow.',
        hours_logged: 2.0,
      },
      {
        external_task_id: 'AC-1008',
        task_name: 'Write unit tests for new features',
        status: 'completed',
        last_comment: 'Added comprehensive test coverage. All tests passing.',
        hours_logged: 4.5,
      },
    ];

    // Insert sample ActiveCollab task data
    const taskPromises = sampleTasks.map(async (task, index) => {
      const assignee = users[index % users.length];
      const project = projects && projects.length > 0 ? projects[index % projects.length] : null;

      const { error } = await supabase
        .from('activecollab_task_data')
        .upsert({
          external_task_id: task.external_task_id,
          task_name: task.task_name,
          assignee_id: assignee.id,
          project_id: project?.id || null,
          status: task.status,
          last_comment: task.last_comment,
          last_comment_date: new Date().toISOString(),
          hours_logged: task.hours_logged,
          sync_date: today,
          raw_data: { sample: true },
        }, {
          onConflict: 'external_task_id',
        });

      if (error) {
        console.error(`Error inserting task ${task.external_task_id}:`, error);
      }
    });

    await Promise.all(taskPromises);

    // Create sample EOD submissions for today and yesterday
    const eodSubmissions = users.slice(0, 3).map((user, index) => {
      const taskCount = index + 2;
      const taskLinks = sampleTasks.slice(index * 2, index * 2 + taskCount).map(t => 
        `https://app.activecollab.com/123/projects/456/tasks/${t.external_task_id}`
      );

      return [
        {
          user_id: user.id,
          submission_date: today,
          task_links: taskLinks,
          notes: `Completed ${taskCount} tasks today. Made good progress on key features.`,
        },
        {
          user_id: user.id,
          submission_date: yesterday,
          task_links: taskLinks.slice(0, -1),
          notes: `Focused on bug fixes and documentation. All planned tasks completed.`,
        },
      ];
    }).flat();

    const { error: eodError } = await supabase
      .from('team_eod_submissions')
      .upsert(eodSubmissions, {
        onConflict: 'user_id,submission_date',
      });

    if (eodError) {
      console.error('Error inserting EOD submissions:', eodError);
    }

    // Create sample AI summaries
    const summaries = users.slice(0, 3).map((user, index) => {
      const productivity = 70 + (index * 10);
      const tasksCompleted = index + 2;
      const hoursLogged = 6 + index;

      return [
        {
          user_id: user.id,
          summary_date: today,
          ai_summary: {
            overall_summary: `${user.first_name} had a highly productive day, completing ${tasksCompleted} tasks with excellent quality. Strong focus on core features and documentation.`,
            key_accomplishments: [
              'Completed authentication implementation',
              'Updated API documentation',
              'Conducted thorough code review',
            ].slice(0, tasksCompleted),
            concerns: index === 0 ? ['One task still in progress, may need extra time'] : [],
            recommendations: [
              'Continue current pace',
              'Consider pairing on complex features',
            ],
            hours_analysis: `Logged ${hoursLogged} hours across ${tasksCompleted} tasks. Good distribution of time.`,
          },
          tasks_completed: tasksCompleted,
          hours_logged: hoursLogged,
          productivity_score: productivity,
          key_accomplishments: [
            'Implemented core authentication flow',
            'Updated technical documentation',
          ],
          concerns: index === 0 ? ['Payment bug fix taking longer than expected'] : [],
        },
        {
          user_id: user.id,
          summary_date: yesterday,
          ai_summary: {
            overall_summary: `${user.first_name} completed ${tasksCompleted - 1} tasks yesterday with good efficiency. Focused primarily on bug fixes and testing.`,
            key_accomplishments: [
              'Fixed critical payment bug',
              'Added comprehensive test coverage',
            ],
            concerns: [],
            recommendations: [
              'Maintain testing momentum',
            ],
            hours_analysis: `Logged ${hoursLogged - 0.5} hours. Consistent with team average.`,
          },
          tasks_completed: tasksCompleted - 1,
          hours_logged: hoursLogged - 0.5,
          productivity_score: productivity - 5,
          key_accomplishments: [
            'Fixed payment processing bug',
            'Wrote comprehensive unit tests',
          ],
          concerns: [],
        },
      ];
    }).flat();

    const { error: summaryError } = await supabase
      .from('team_daily_summaries')
      .upsert(summaries, {
        onConflict: 'user_id,summary_date',
      });

    if (summaryError) {
      console.error('Error inserting summaries:', summaryError);
    }

    return new Response(
      JSON.stringify({
        message: 'Sample data seeded successfully',
        data: {
          tasks: sampleTasks.length,
          eod_submissions: eodSubmissions.length,
          summaries: summaries.length,
          users_involved: users.length,
        },
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: unknown) {
    console.error('Error seeding sample data:', error);
    const err = error as Error;
    return new Response(
      JSON.stringify({ error: err.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

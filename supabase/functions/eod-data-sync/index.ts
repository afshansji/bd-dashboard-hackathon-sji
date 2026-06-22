import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

interface TaskData {
  external_task_id: string;
  task_name: string;
  assignee_email?: string;
  assignee_id?: number;
  project_id: string;
  status: string;
  last_comment?: string;
  last_comment_date?: string;
  hours_logged: number;
  raw_data?: any;
}

interface SyncPayload {
  sync_date: string;
  tasks: TaskData[];
  webhook_secret?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('EOD Data Sync: Request received');

    // Validate webhook secret
    const webhookSecret = req.headers.get('x-webhook-secret');
    const expectedSecret = Deno.env.get('EOD_WEBHOOK_SECRET');

    if (!webhookSecret || webhookSecret !== expectedSecret) {
      console.error('Invalid webhook secret');
      return new Response(
        JSON.stringify({ error: 'Invalid webhook secret' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const payload: SyncPayload = await req.json();
    console.log(`Processing ${payload.tasks.length} tasks for date: ${payload.sync_date}`);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each task
    for (const task of payload.tasks) {
      try {
        // Find user by email if provided
        let userId: string | null = null;
        if (task.assignee_email) {
          const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('email', task.assignee_email)
            .single();
          
          userId = user?.id || null;
        }

        // Find project by external ID
        let projectId: string | null = null;
        if (task.project_id) {
          const { data: project } = await supabase
            .from('projects')
            .select('id')
            .eq('external_project_id', task.project_id)
            .single();
          
          projectId = project?.id || null;
        }

        // Upsert task data
        const { error: upsertError } = await supabase
          .from('activecollab_task_data')
          .upsert({
            external_task_id: task.external_task_id,
            task_name: task.task_name,
            assignee_id: userId,
            project_id: projectId,
            status: task.status,
            last_comment: task.last_comment || null,
            last_comment_date: task.last_comment_date || null,
            hours_logged: task.hours_logged,
            sync_date: payload.sync_date,
            raw_data: task.raw_data || {},
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'external_task_id',
          });

        if (upsertError) {
          console.error(`Error upserting task ${task.external_task_id}:`, upsertError);
          results.failed++;
          results.errors.push(`Task ${task.external_task_id}: ${upsertError.message}`);
          continue;
        }

        // Update project_tasks hours if we can map it
        if (projectId && userId) {
          const { error: hoursError } = await supabase
            .from('project_tasks')
            .update({
              imported_hours: task.hours_logged,
              last_hours_import: new Date().toISOString(),
            })
            .eq('external_task_id', task.external_task_id);

          if (hoursError) {
            console.warn(`Could not update hours for task ${task.external_task_id}:`, hoursError.message);
          }
        }

        results.success++;
      } catch (taskError: unknown) {
        console.error(`Error processing task ${task.external_task_id}:`, taskError);
        results.failed++;
        const error = taskError as Error;
        results.errors.push(`Task ${task.external_task_id}: ${error.message}`);
      }
    }

    console.log(`Sync complete: ${results.success} success, ${results.failed} failed`);

    return new Response(
      JSON.stringify({
        message: 'Sync completed',
        results,
        sync_date: payload.sync_date,
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: unknown) {
    console.error('Error in eod-data-sync:', error);
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

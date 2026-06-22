import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HoursImportData {
  project_hours?: Array<{
    external_project_id: string;
    total_logged_hours: number;
  }>;
  task_hours?: Array<{
    external_task_id: string;
    imported_hours: number;
    project_id?: string;
  }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data: HoursImportData = await req.json();
    console.log('Importing hours data:', data);

    const results: any = {
      projects_updated: 0,
      tasks_updated: 0,
      errors: []
    };

    // Import project hours
    if (data.project_hours && data.project_hours.length > 0) {
      for (const projectHours of data.project_hours) {
        const { error: projectError } = await supabaseClient
          .from('projects')
          .update({
            total_logged_hours: projectHours.total_logged_hours,
            last_hours_import: new Date().toISOString(),
            external_project_id: projectHours.external_project_id
          })
          .eq('external_project_id', projectHours.external_project_id);

        if (projectError) {
          console.error('Error updating project hours:', projectError);
          results.errors.push(`Project ${projectHours.external_project_id}: ${projectError.message}`);
        } else {
          results.projects_updated++;
        }
      }
    }

    // Import task hours
    if (data.task_hours && data.task_hours.length > 0) {
      for (const taskHours of data.task_hours) {
        const updateData: any = {
          imported_hours: taskHours.imported_hours,
          last_hours_import: new Date().toISOString(),
          external_task_id: taskHours.external_task_id
        };

        const { error: taskError } = await supabaseClient
          .from('project_tasks')
          .update(updateData)
          .eq('external_task_id', taskHours.external_task_id);

        if (taskError) {
          console.error('Error updating task hours:', taskError);
          results.errors.push(`Task ${taskHours.external_task_id}: ${taskError.message}`);
        } else {
          results.tasks_updated++;
        }
      }
    }

    console.log('Import results:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully imported hours for ${results.projects_updated} projects and ${results.tasks_updated} tasks`,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in import-hours function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: (error as Error).message || 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
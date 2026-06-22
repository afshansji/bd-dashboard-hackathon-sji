import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Scheduled BD Manager Agent: Starting');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check if agent scheduling is enabled
    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .select('schedule_config, is_enabled')
      .eq('slug', 'bd-manager-weekly-review')
      .single();

    if (agentError) {
      console.error('Error fetching agent config:', agentError);
      throw new Error('Agent configuration not found');
    }

    if (!agent?.is_enabled) {
      console.log('Agent is disabled');
      return new Response(
        JSON.stringify({ success: false, message: 'Agent is disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const scheduleConfig = agent.schedule_config as { enabled?: boolean; email_recipients?: string[] } | null;
    
    if (!scheduleConfig?.enabled) {
      console.log('Agent scheduling is disabled');
      return new Response(
        JSON.stringify({ success: false, message: 'Scheduling disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Invoke main agent function
    console.log('Invoking bd-manager-weekly-review function...');
    const { data, error } = await supabase.functions.invoke('bd-manager-weekly-review', {
      body: {
        forceRerun: false,
        sendEmail: true,
        recipients: scheduleConfig.email_recipients || []
      }
    });

    if (error) {
      console.error('Agent invocation error:', error);
      throw error;
    }

    console.log('Scheduled execution successful:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Scheduled execution error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

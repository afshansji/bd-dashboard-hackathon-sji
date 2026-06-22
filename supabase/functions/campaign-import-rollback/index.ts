import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { importId, reason } = await req.json();

    if (!importId) {
      return new Response(
        JSON.stringify({ error: 'Import ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch import job
    const { data: job, error: jobError } = await supabase
      .from('lead_import_jobs')
      .select('*, bd_campaigns!inner(created_by, owned_by)')
      .eq('id', importId)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: 'Import job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already rolled back
    if (job.is_rolled_back) {
      return new Response(
        JSON.stringify({ error: 'Import has already been rolled back' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check permissions
    const isOwner = job.bd_campaigns.created_by === user.id || job.bd_campaigns.owned_by === user.id;
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    const isAdmin = userRoles?.some(r => r.role === 'admin' || r.role === 'super_admin');

    if (!isOwner && !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Permission denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get contact IDs from rollback_data
    const contactIds = job.rollback_data?.contact_ids || [];

    if (contactIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No contacts to rollback' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete contacts
    const { error: deleteError } = await supabase
      .from('campaign_contacts')
      .delete()
      .in('id', contactIds);

    if (deleteError) {
      console.error('Error deleting contacts:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete contacts' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update job record
    const { error: updateError } = await supabase
      .from('lead_import_jobs')
      .update({
        is_rolled_back: true,
        rolled_back_at: new Date().toISOString(),
        rolled_back_by: user.id,
        result: {
          ...job.result,
          rollback_reason: reason,
        },
      })
      .eq('id', importId);

    if (updateError) {
      console.error('Error updating job:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        contactsRemoved: contactIds.length,
        message: `Successfully rolled back import and removed ${contactIds.length} contacts`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in rollback function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

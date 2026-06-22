import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { corsHeaders } from '../_shared/cors.ts';
import { getControlTowerCredentials } from '../_shared/credentials.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[sync-control-tower-pods] Starting POD import from Control Tower...');

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get Control Tower credentials
    const { url: CONTROL_TOWER_URL, key: CONTROL_TOWER_ANON_KEY } = getControlTowerCredentials();

    console.log('[sync-control-tower-pods] Fetching PODs from Control Tower...');

    // Create Control Tower Supabase client
    const ctClient = createClient(CONTROL_TOWER_URL, CONTROL_TOWER_ANON_KEY);

    // Fetch all pods from Control Tower (Control Tower schema may differ, so we fetch all)
    const { data: ctPods, error: ctError } = await ctClient
      .from('pods')
      .select('*');

    if (ctError) {
      console.error('[sync-control-tower-pods] Error fetching PODs from Control Tower:', ctError);
      throw new Error(`Failed to fetch PODs: ${ctError.message}`);
    }

    console.log(`[sync-control-tower-pods] Fetched ${ctPods?.length || 0} PODs from Control Tower`);

    if (!ctPods || ctPods.length === 0) {
      console.log('[sync-control-tower-pods] No PODs found in Control Tower');
      return new Response(
        JSON.stringify({
          success: true,
          podsImported: 0,
          podNames: [],
          message: 'No PODs found in Control Tower',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter for active pods if the field exists in Control Tower data
    const activePods = ctPods.filter(pod => {
      // If is_active field exists, use it; otherwise include all pods
      return pod.is_active === undefined || pod.is_active === true;
    });

    console.log(`[sync-control-tower-pods] Processing ${activePods.length} active PODs`);

    // Get existing PODs
    const { data: existingPods } = await supabaseClient
      .from('pods')
      .select('id, name');

    const existingPodNames = new Set(existingPods?.map(p => p.name) || []);

    // Prepare PODs to insert (only new ones)
    const podsToInsert = activePods
      .filter(pod => !existingPodNames.has(pod.name))
      .map(pod => ({
        name: pod.name,
        description: pod.description || 'Imported from Control Tower',
        is_active: true,
        lead_user_id: null,
      }));

    let insertedCount = 0;
    let updatedCount = 0;

    // Insert new PODs
    if (podsToInsert.length > 0) {
      console.log(`[sync-control-tower-pods] Inserting ${podsToInsert.length} new PODs...`);
      const { data: insertedPods, error: insertError } = await supabaseClient
        .from('pods')
        .insert(podsToInsert)
        .select();

      if (insertError) {
        console.error('[sync-control-tower-pods] Error inserting PODs:', insertError);
        throw insertError;
      }

      insertedCount = insertedPods?.length || 0;
      console.log(`[sync-control-tower-pods] Successfully inserted ${insertedCount} PODs`);
    }

    // Update existing PODs
    const podsToUpdate = activePods.filter(pod => existingPodNames.has(pod.name));
    if (podsToUpdate.length > 0) {
      console.log(`[sync-control-tower-pods] Updating ${podsToUpdate.length} existing PODs...`);
      
      for (const ctPod of podsToUpdate) {
        const { error: updateError } = await supabaseClient
          .from('pods')
          .update({
            description: ctPod.description || 'Imported from Control Tower',
            is_active: ctPod.is_active ?? true,
            updated_at: new Date().toISOString(),
          })
          .eq('name', ctPod.name);

        if (updateError) {
          console.error(`[sync-control-tower-pods] Error updating POD ${ctPod.name}:`, updateError);
        } else {
          updatedCount++;
        }
      }
      
      console.log(`[sync-control-tower-pods] Successfully updated ${updatedCount} PODs`);
    }

    const podNames = activePods.map(p => p.name).sort();

    return new Response(
      JSON.stringify({
        success: true,
        podsInserted: insertedCount,
        podsUpdated: updatedCount,
        totalPods: activePods.length,
        podNames: podNames,
        message: `Successfully synced ${activePods.length} PODs from Control Tower (${insertedCount} new, ${updatedCount} updated)`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[sync-control-tower-pods] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

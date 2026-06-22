/**
 * Control Tower Clients Direct Database Sync Edge Function
 *
 * Syncs clients from Control Tower using direct Supabase-to-Supabase connection
 * (same approach as deal sync, not REST API)
 *
 * Features:
 * - Direct database connection to Control Tower
 * - Upsert logic (prevents duplicates)
 * - Comprehensive error handling
 * - Progress tracking
 * - Sync logging
 *
 * @endpoint POST /sync-control-tower-clients-api
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

// ============================================================================
// Type Definitions
// ============================================================================

interface SyncResult {
  clients: {
    new: number;
    updated: number;
    skipped: number;
    failed: number;
    total_fetched: number;
  };
  errors: string[];
  warnings: string[];
  duration: number;
}

interface CTClient {
  id: string;
  name: string;
  email?: string;
  company?: string;
  phone?: string;
  status?: string;
  website?: string;
  industry?: string;
  contact_person?: string;
  contact_name?: string;
  primary_contact?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const result: SyncResult = {
    clients: {
      new: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      total_fetched: 0,
    },
    errors: [],
    warnings: [],
    duration: 0,
  };

  try {
    console.log('[ClientSync] Starting Control Tower Clients sync...');

    // ========================================================================
    // Authentication & Setup
    // ========================================================================

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user authentication
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError) {
      console.warn('[ClientSync] Unable to resolve user:', authError.message);
    }

    const userId = user?.id ?? null;
    console.log(`[ClientSync] User ID: ${userId || 'service'}`);

    // ========================================================================
    // Get Control Tower Direct Connection
    // ========================================================================

    const ctUrl = Deno.env.get('Controltowerurl');
    const ctKey = Deno.env.get('CONTROLTOWERAPIKEY');

    if (!ctUrl || !ctKey) {
      throw new Error('Control Tower credentials not configured in edge secrets (Controltowerurl, CONTROLTOWERAPIKEY)');
    }

    console.log(`[ClientSync] Connecting to Control Tower: ${ctUrl}`);

    // Create Control Tower client
    const ctClient = createClient(ctUrl, ctKey);

    // ========================================================================
    // Create or Update Sync Status Record
    // ========================================================================

    let syncStatusId: string | null = null;

    try {
      const { data: statusData, error: statusError } = await supabase
        .from('control_tower_sync_status')
        .upsert({
          sync_type: 'clients_direct',
          status: 'running',
          started_at: new Date().toISOString(),
          metadata: {
            current_phase: 'clients',
            direct_db_sync: true,
            user_id: userId,
          },
        }, {
          onConflict: 'sync_type',
        })
        .select('id')
        .single();

      if (statusError) {
        console.warn('[ClientSync] Could not create sync status:', statusError);
      } else {
        syncStatusId = statusData?.id;
      }
    } catch (e) {
      console.warn('[ClientSync] Sync status tracking unavailable:', e);
    }

    // ========================================================================
    // Fetch Clients from Control Tower Database
    // ========================================================================

    console.log('[ClientSync] Fetching clients from Control Tower database...');

    // Try 'Client' table first (capitalized), then 'clients' (lowercase)
    let clients: CTClient[] = [];
    let fetchError: any = null;

    // Try Client table
    const { data: clientsData, error: clientsError } = await ctClient
      .from('Client')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (clientsError) {
      console.log('[ClientSync] Client table not found, trying clients table...');
      
      // Try clients table
      const { data: clientsDataLower, error: clientsErrorLower } = await ctClient
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (clientsErrorLower) {
        fetchError = clientsErrorLower;
        console.error('[ClientSync] Neither Client nor clients table found:', clientsErrorLower);
      } else {
        clients = clientsDataLower || [];
      }
    } else {
      clients = clientsData || [];
    }

    // If no clients found and there was an error, provide helpful message
    if (clients.length === 0 && fetchError) {
      const errorMessage = 'Control Tower does not have a Client/clients table. Clients are extracted from deals during Full Sync.';
      
      result.warnings.push(errorMessage);
      result.duration = Date.now() - startTime;

      // Log the result
      await supabase
        .from('control_tower_sync_log')
        .insert({
          sync_type: 'pull_clients_direct',
          status: 'info',
          records_synced: 0,
          records_failed: 0,
          error_message: errorMessage,
          duration_ms: result.duration,
          metadata: {
            message: 'No Client table in Control Tower',
            suggestion: 'Use Full Sync to populate clients from deals'
          },
        });

      if (syncStatusId) {
        await supabase
          .from('control_tower_sync_status')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            metadata: {
              current_phase: 'completed',
              direct_db_sync: true,
              user_id: userId,
              message: errorMessage,
            },
          })
          .eq('id', syncStatusId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: errorMessage,
          result,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(`[ClientSync] Fetched ${clients.length} clients from Control Tower`);
    result.clients.total_fetched = clients.length;

    // ========================================================================
    // Sync Clients to Local Database
    // ========================================================================

    for (const ctClient of clients) {
      try {
        // Build safe OR condition for checking existing client
        const orConditions = [];
        if (ctClient.id) {
          orConditions.push(`control_tower_id.eq.${ctClient.id}`);
        }
        const companyName = (ctClient.company || ctClient.name || '').replace(/[()]/g, '');
        if (companyName) {
          orConditions.push(`company.ilike.${companyName}`);
        }

        // Check if client already exists by control_tower_id or company name
        const { data: existingClient, error: checkError } = await supabase
          .from('clients')
          .select('id, name, updated_at')
          .or(orConditions.join(','))
          .maybeSingle();

        if (checkError) {
          console.error(`[ClientSync] Error checking existing client ${ctClient.id}:`, checkError);
          result.clients.failed++;
          result.errors.push(`Failed to check client ${ctClient.name}: ${checkError.message}`);
          continue;
        }

        // Map Control Tower client to local schema
        const clientData = {
          name: ctClient.name || ctClient.company || 'Unknown Client',
          email: ctClient.email || null,
          company: ctClient.company || ctClient.name || null,
          phone: ctClient.phone || null,
          status: mapClientStatus(ctClient.status),
          website: ctClient.website || null,
          industry: ctClient.industry || null,
          contact_person: ctClient.contact_person || ctClient.contact_name || ctClient.primary_contact || null,
          address: ctClient.address || null,
          city: ctClient.city || null,
          state: ctClient.state || null,
          country: ctClient.country || null,
          postal_code: ctClient.postal_code || null,
          control_tower_id: ctClient.id,
        };

        if (existingClient) {
          // Update existing client
          const { error: updateError } = await supabase
            .from('clients')
            .update(clientData)
            .eq('id', existingClient.id);

          if (updateError) {
            console.error(`[ClientSync] Failed to update client ${ctClient.id}:`, updateError);
            result.clients.failed++;
            result.errors.push(`Failed to update client ${ctClient.name}: ${updateError.message}`);
          } else {
            result.clients.updated++;
            console.log(`[ClientSync] Updated client: ${ctClient.name}`);
          }
        } else {
          // Insert new client
          const { error: insertError } = await supabase
            .from('clients')
            .insert(clientData);

          if (insertError) {
            // Check if it's a duplicate error (unique constraint)
            if (insertError.code === '23505') {
              console.warn(`[ClientSync] Client already exists: ${ctClient.name}`);
              result.clients.skipped++;
              result.warnings.push(`Client already exists: ${ctClient.name}`);
            } else {
              console.error(`[ClientSync] Failed to insert client ${ctClient.id}:`, insertError);
              result.clients.failed++;
              result.errors.push(`Failed to insert client ${ctClient.name}: ${insertError.message}`);
            }
          } else {
            result.clients.new++;
            console.log(`[ClientSync] Created new client: ${ctClient.name}`);
          }
        }
      } catch (clientError) {
        console.error(`[ClientSync] Error processing client ${ctClient.id}:`, clientError);
        result.clients.failed++;
        const errorMessage = clientError instanceof Error ? clientError.message : String(clientError);
        result.errors.push(`Error processing client ${ctClient.name || ctClient.id}: ${errorMessage}`);
      }
    }

    // ========================================================================
    // Finalize Sync
    // ========================================================================

    result.duration = Date.now() - startTime;

    console.log(`[ClientSync] Sync completed in ${result.duration}ms`);
    console.log(`[ClientSync] Results:`, JSON.stringify(result.clients, null, 2));

    // Create sync log entry
    try {
      await supabase
        .from('control_tower_sync_log')
        .insert({
          sync_type: 'pull_clients_direct',
          status: result.errors.length > 0 ? 'partial_success' : 'success',
          records_synced: result.clients.new + result.clients.updated,
          records_failed: result.clients.failed,
          error_message: result.errors.length > 0 ? result.errors.join('; ') : null,
          duration_ms: result.duration,
          metadata: {
            new: result.clients.new,
            updated: result.clients.updated,
            skipped: result.clients.skipped,
            failed: result.clients.failed,
            total_fetched: result.clients.total_fetched,
            warnings: result.warnings,
          },
        });
    } catch (logError) {
      console.warn('[ClientSync] Failed to create sync log:', logError);
    }

    // Update sync status to completed
    if (syncStatusId) {
      await supabase
        .from('control_tower_sync_status')
        .update({
          status: result.errors.length > 0 ? 'partial_success' : 'completed',
          completed_at: new Date().toISOString(),
          metadata: {
            current_phase: 'completed',
            direct_db_sync: true,
            user_id: userId,
            clients_synced: result.clients.new + result.clients.updated,
            result,
          },
        })
        .eq('id', syncStatusId);
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        result,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[ClientSync] Sync failed:', error);

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    result.duration = Date.now() - startTime;
    result.errors.push(errorMessage);

    // Try to log the error
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase
        .from('control_tower_sync_log')
        .insert({
          sync_type: 'pull_clients_direct',
          status: 'failed',
          records_synced: result.clients.new + result.clients.updated,
          records_failed: result.clients.failed,
          error_message: errorMessage,
          duration_ms: result.duration,
          metadata: {
            error: errorMessage,
            stack: errorStack,
            result,
          },
        });
    } catch (logError) {
      console.warn('[ClientSync] Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        result,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// ============================================================================
// Helper Functions
// ============================================================================

function mapClientStatus(status?: string): string {
  if (!status) return 'active';
  
  const statusLower = status.toLowerCase();
  
  if (statusLower.includes('active') || statusLower === 'open') {
    return 'active';
  } else if (statusLower.includes('inactive') || statusLower === 'closed') {
    return 'inactive';
  } else if (statusLower.includes('archive')) {
    return 'archived';
  }
  
  return 'active'; // Default to active
}

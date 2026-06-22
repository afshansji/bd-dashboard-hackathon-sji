import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { corsHeaders } from "../_shared/cors.ts";

interface FullSyncResult {
  employees: { new: number; updated: number; failed: number };
  pods: { new: number; updated: number; failed: number };
  deals: { new: number; updated: number; failed: number };
  clients: { new: number; updated: number };
  checklists: { synced: number; failed: number };
  warnings: string[];
  errors: string[];
  duration: number;
  mappingStats: {
    unmappedOwners: number;
    unmappedPMs: number;
    unmappedPods: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const result: FullSyncResult = {
    employees: { new: 0, updated: 0, failed: 0 },
    pods: { new: 0, updated: 0, failed: 0 },
    deals: { new: 0, updated: 0, failed: 0 },
    clients: { new: 0, updated: 0 },
    checklists: { synced: 0, failed: 0 },
    warnings: [],
    errors: [],
    duration: 0,
    mappingStats: {
      unmappedOwners: 0,
      unmappedPMs: 0,
      unmappedPods: 0,
    },
  };

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    const userId = user?.id ?? null;
    console.log(`[Full Sync] Starting full synchronization for user: ${userId || 'system'}`);

    // Get Control Tower credentials
    const ctUrl = Deno.env.get('Controltowerurl');
    const ctKey = Deno.env.get('CONTROLTOWERAPIKEY');
    
    if (!ctUrl || !ctKey) {
      throw new Error('Control Tower credentials not configured');
    }

    const ctClient = createClient(ctUrl, ctKey);

    // ===== PHASE 1: Sync Employees =====
    console.log('[Full Sync] Phase 1: Syncing employees...');
    try {
      const { data: ctEmployees, error: empError } = await ctClient
        .from('User')
        .select('*');

      if (empError) throw empError;

      const employeeMapping = new Map<string, string>(); // CT ID -> Local ID

      for (const ctEmp of ctEmployees || []) {
        try {
          const empData = {
            control_tower_id: String(ctEmp.id),
            full_name: `${ctEmp.first_name || ''} ${ctEmp.last_name || ''}`.trim() || ctEmp.email || 'Unknown',
            email: ctEmp.email || null,
            phone: ctEmp.phone || null,
            role: ctEmp.title || ctEmp.role || null,
            department: ctEmp.department || null,
            synced_from_control_tower: true,
            last_synced_at: new Date().toISOString(),
          };

          const { data: existing } = await supabase
            .from('employees')
            .select('id')
            .eq('control_tower_id', empData.control_tower_id)
            .maybeSingle();

          if (existing) {
            await supabase.from('employees').update(empData).eq('id', existing.id);
            employeeMapping.set(empData.control_tower_id, existing.id);
            result.employees.updated++;
          } else {
            const { data: inserted } = await supabase
              .from('employees')
              .insert(empData)
              .select('id')
              .single();
            if (inserted) {
              employeeMapping.set(empData.control_tower_id, inserted.id);
              result.employees.new++;
            }
          }
        } catch (error) {
          result.employees.failed++;
          result.errors.push(`Employee ${ctEmp.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      console.log(`[Full Sync] Employees: ${result.employees.new} new, ${result.employees.updated} updated`);
    } catch (error) {
      result.errors.push(`Employee sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // ===== PHASE 2: Sync PODs =====
    console.log('[Full Sync] Phase 2: Syncing PODs...');
    try {
      const { data: ctPods, error: podError } = await ctClient
        .from('pods')
        .select('*');

      if (podError) throw podError;

      const podMapping = new Map<string, string>(); // Pod name -> Local ID

      const activePods = (ctPods || []).filter(pod => 
        pod.is_active === undefined || pod.is_active === true
      );

      for (const ctPod of activePods) {
        try {
          const podData = {
            name: ctPod.name,
            description: ctPod.description || 'Synced from Control Tower',
            is_active: true,
          };

          const { data: existing } = await supabase
            .from('pods')
            .select('id')
            .eq('name', podData.name)
            .maybeSingle();

          if (existing) {
            await supabase.from('pods').update(podData).eq('id', existing.id);
            podMapping.set(podData.name, existing.id);
            result.pods.updated++;
          } else {
            const { data: inserted } = await supabase
              .from('pods')
              .insert(podData)
              .select('id')
              .single();
            if (inserted) {
              podMapping.set(podData.name, inserted.id);
              result.pods.new++;
            }
          }
        } catch (error) {
          result.pods.failed++;
          result.errors.push(`POD ${ctPod.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      console.log(`[Full Sync] PODs: ${result.pods.new} new, ${result.pods.updated} updated`);
    } catch (error) {
      result.errors.push(`POD sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // ===== PHASE 3: Sync Deals, Clients & Checklists =====
    console.log('[Full Sync] Phase 3: Syncing deals...');
    
    // Invoke the existing sync-control-tower-deals function to handle deals
    const { data: dealSyncResult, error: dealSyncError } = await supabase.functions.invoke(
      'sync-control-tower-deals',
      {
        headers: { Authorization: authHeader },
        body: { forceFullSync: false, mode: 'full' }
      }
    );

    if (dealSyncError) {
      result.errors.push(`Deal sync failed: ${dealSyncError.message}`);
    } else if (dealSyncResult) {
      result.deals.new = dealSyncResult.deals?.new || 0;
      result.deals.updated = dealSyncResult.deals?.updated || 0;
      result.deals.failed = dealSyncResult.deals?.failed || 0;
      result.clients.new = dealSyncResult.clients?.new || 0;
      result.clients.updated = dealSyncResult.clients?.updated || 0;
      result.checklists.synced = dealSyncResult.checklists?.synced || 0;
      result.checklists.failed = dealSyncResult.checklists?.failed || 0;
      
      if (dealSyncResult.errors && Array.isArray(dealSyncResult.errors)) {
        result.errors.push(...dealSyncResult.errors);
      }
    }

    // Get mapping statistics
    const { data: healthData } = await supabase.rpc('get_sync_health_summary');
    if (healthData) {
      result.mappingStats.unmappedOwners = healthData.unmapped_owners || 0;
      result.mappingStats.unmappedPMs = healthData.unmapped_pms || 0;
      result.mappingStats.unmappedPods = healthData.unmapped_pods || 0;

      if (result.mappingStats.unmappedOwners > 0) {
        result.warnings.push(`${result.mappingStats.unmappedOwners} deals have unmapped owners`);
      }
      if (result.mappingStats.unmappedPMs > 0) {
        result.warnings.push(`${result.mappingStats.unmappedPMs} deals have unmapped PMs`);
      }
      if (result.mappingStats.unmappedPods > 0) {
        result.warnings.push(`${result.mappingStats.unmappedPods} deals have unmapped PODs`);
      }
    }

    result.duration = Date.now() - startTime;

    // Log successful full sync
    await supabase.from('control_tower_sync_log').insert({
      sync_type: 'pull',
      entity_type: 'full_sync',
      status: 'success',
      payload: {
        employees: result.employees,
        pods: result.pods,
        deals: result.deals,
        clients: result.clients,
        checklists: result.checklists,
        mappingStats: result.mappingStats,
      },
      synced_by: userId,
    });

    console.log(`[Full Sync] Complete in ${result.duration}ms`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Full Sync] Error:', error);
    result.duration = Date.now() - startTime;
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');

    return new Response(JSON.stringify(result), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

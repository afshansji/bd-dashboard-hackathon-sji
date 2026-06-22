import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

interface SyncResult {
  employees: {
    new: number;
    updated: number;
    failed: number;
  };
  errors: string[];
  duration: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    console.log('[EmployeeSync] Starting Control Tower employee sync');

    // Get Control Tower credentials
    const envUrl = Deno.env.get('Controltowerurl');
    const envKey = Deno.env.get('CONTROLTOWERAPIKEY');
    
    if (!envUrl || !envKey) {
      throw new Error('Control Tower credentials not configured');
    }

    // Create clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const ctClient = createClient(envUrl, envKey);

    // Fetch all users/employees from Control Tower
    console.log('[EmployeeSync] Fetching employees from Control Tower...');
    const { data: ctEmployees, error: fetchError } = await ctClient
      .from('User')
      .select('*');

    if (fetchError) {
      throw new Error(`Failed to fetch employees: ${fetchError.message}`);
    }

    if (!ctEmployees || ctEmployees.length === 0) {
      console.log('[EmployeeSync] No employees found in Control Tower');
      return new Response(
        JSON.stringify({
          employees: { new: 0, updated: 0, failed: 0 },
          errors: [],
          duration: Date.now() - startTime
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[EmployeeSync] Found ${ctEmployees.length} employees in Control Tower`);

    const result: SyncResult = {
      employees: { new: 0, updated: 0, failed: 0 },
      errors: [],
      duration: 0
    };

    // Sync each employee
    for (const ctEmp of ctEmployees) {
      try {
        const controlTowerId = String(ctEmp.id);
        const fullName = ctEmp.full_name || 
                        ctEmp.name || 
                        `${ctEmp.first_name || ''} ${ctEmp.last_name || ''}`.trim() ||
                        'Unknown Employee';
        const email = ctEmp.email || ctEmp.work_email || null;
        const phone = ctEmp.phone || ctEmp.work_phone || null;
        const role = ctEmp.role || ctEmp.position || ctEmp.title || null;
        const department = ctEmp.department || null;

        // Check if employee exists
        const { data: existing } = await supabase
          .from('employees')
          .select('id')
          .eq('control_tower_id', controlTowerId)
          .maybeSingle();

        if (existing) {
          // Update existing employee
          const { error: updateError } = await supabase
            .from('employees')
            .update({
              full_name: fullName,
              email,
              phone,
              role,
              department,
              last_synced_at: new Date().toISOString(),
              metadata: ctEmp
            })
            .eq('id', existing.id);

          if (updateError) {
            console.error(`[EmployeeSync] Failed to update employee ${controlTowerId}:`, updateError);
            result.employees.failed++;
            result.errors.push(`Update failed for ${fullName}: ${updateError.message}`);
          } else {
            result.employees.updated++;
            console.log(`[EmployeeSync] Updated employee: ${fullName}`);
          }
        } else {
          // Insert new employee
          const { error: insertError } = await supabase
            .from('employees')
            .insert({
              control_tower_id: controlTowerId,
              full_name: fullName,
              email,
              phone,
              role,
              department,
              synced_from_control_tower: true,
              last_synced_at: new Date().toISOString(),
              metadata: ctEmp
            });

          if (insertError) {
            console.error(`[EmployeeSync] Failed to insert employee ${controlTowerId}:`, insertError);
            result.employees.failed++;
            result.errors.push(`Insert failed for ${fullName}: ${insertError.message}`);
          } else {
            result.employees.new++;
            console.log(`[EmployeeSync] Created employee: ${fullName}`);
          }
        }
      } catch (err) {
        const error = err as Error;
        console.error('[EmployeeSync] Error processing employee:', error);
        result.employees.failed++;
        result.errors.push(error.message);
      }
    }

    result.duration = Date.now() - startTime;

    console.log('[EmployeeSync] Sync complete:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[EmployeeSync] Error:', error);
    return new Response(
      JSON.stringify({
        employees: { new: 0, updated: 0, failed: 0 },
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        duration: Date.now() - startTime
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

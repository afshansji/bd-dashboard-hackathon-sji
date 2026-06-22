import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrollmentConfig {
  scheduling_mode: 'immediate' | 'scheduled' | 'drip';
  batch_config?: {
    messagesPerBatch: number;
    interval: number;
    intervalUnit: 'minutes' | 'hours' | 'days';
  };
  send_days?: string[];
  time_window_start?: string;
  time_window_end?: string;
  start_date_time?: string;
  email_template_id: string;
}

interface EnrollRequest {
  sequenceId: string;
  contactIds: string[];
  config: EnrollmentConfig;
}

interface CreatedEnrollment {
  id: string;
  contact_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // User client for authorization checks
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Service role client for writes (bypasses RLS)
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { sequenceId, contactIds, config }: EnrollRequest = await req.json();

    console.log('Enrollment request:', { 
      sequenceId, 
      contactCount: contactIds.length, 
      mode: config.scheduling_mode 
    });

    // Validate sequence exists and is active
    const { data: sequence, error: seqError } = await userClient
      .from('campaign_sequences')
      .select('id, campaign_id, status')
      .eq('id', sequenceId)
      .single();

    if (seqError || !sequence) {
      throw new Error('Sequence not found');
    }

    if (sequence.status !== 'active') {
      throw new Error('Sequence is not active');
    }

    // Validate contacts belong to campaign
    const { data: contacts, error: contactsError } = await userClient
      .from('campaign_contacts')
      .select('id')
      .eq('campaign_id', sequence.campaign_id)
      .in('id', contactIds);

    if (contactsError || !contacts || contacts.length !== contactIds.length) {
      throw new Error('Some contacts do not belong to this campaign');
    }

    // Check for existing enrollments (idempotency)
    const { data: existingEnrollments, error: existingError } = await serviceClient
      .from('contact_sequence_enrollments')
      .select('contact_id')
      .eq('sequence_id', sequenceId)
      .in('contact_id', contactIds)
      .in('status', ['active', 'paused', 'pending', 'processing']);

    if (existingError) {
      console.error('Error checking existing enrollments:', existingError);
      throw new Error('Failed to check existing enrollments');
    }

    const alreadyEnrolledIds = new Set(
      (existingEnrollments || []).map(e => e.contact_id)
    );
    const newContactIds = contactIds.filter(id => !alreadyEnrolledIds.has(id));
    const alreadyEnrolledCount = alreadyEnrolledIds.size;

    console.log('Enrollment analysis:', {
      total: contactIds.length,
      new: newContactIds.length,
      alreadyEnrolled: alreadyEnrolledCount
    });

    // If all contacts are already enrolled, return success with message
    if (newContactIds.length === 0) {
      return new Response(
        JSON.stringify({
          enrolled: 0,
          alreadyEnrolled: alreadyEnrolledCount,
          batchesCreated: 0,
          message: `All ${alreadyEnrolledCount} contact(s) are already enrolled`,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const startTime = config.start_date_time ? new Date(config.start_date_time) : new Date();

    // Create enrollments only for new contacts
    const enrollments = newContactIds.map(contactId => ({
      sequence_id: sequenceId,
      contact_id: contactId,
      status: 'active',
      current_step: 0,
      scheduling_mode: config.scheduling_mode,
      batch_config: config.batch_config || { messagesPerBatch: 25, interval: 1, intervalUnit: 'days' },
      // Only store time restrictions for drip mode
      send_days: config.send_days || null,
      time_window_start: config.time_window_start || null,
      time_window_end: config.time_window_end || null,
      start_date_time: startTime.toISOString(),
      next_batch_at: config.scheduling_mode === 'drip' ? startTime.toISOString() : null,
      total_sent: 0,
      total_to_send: newContactIds.length,
      email_template_id: config.email_template_id,
      enrolled_at: new Date().toISOString(),
    }));

    const { data: createdEnrollments, error: enrollError } = await serviceClient
      .from('contact_sequence_enrollments')
      .insert(enrollments)
      .select('id, contact_id');

    if (enrollError) {
      console.error('Error creating enrollments:', enrollError);
      throw new Error(`Failed to create enrollments: ${enrollError.message}`);
    }

    let batchesCreated = 0;

    // Create batch queue for ALL scheduling modes
    if (createdEnrollments && createdEnrollments.length > 0) {
      const batches: Array<{
        enrollment_id: string;
        batch_number: number;
        scheduled_for: string;
        status: string;
        contacts_in_batch: string[];
      }> = [];

      if (config.scheduling_mode === 'drip') {
        // DRIP MODE: Create multiple batches over time
        const batchSize = config.batch_config?.messagesPerBatch || 25;
        const interval = config.batch_config?.interval || 1;
        const intervalUnit = config.batch_config?.intervalUnit || 'days';

        // Group enrollments into waves based on batch size
        const waves: CreatedEnrollment[][] = [];
        for (let i = 0; i < createdEnrollments.length; i += batchSize) {
          waves.push(createdEnrollments.slice(i, i + batchSize));
        }

        waves.forEach((wave, waveIndex) => {
          // Calculate scheduled time for this wave
          let scheduledFor = new Date(startTime);
          const waveDelay = waveIndex * interval;
          
          if (intervalUnit === 'minutes') {
            scheduledFor.setMinutes(scheduledFor.getMinutes() + waveDelay);
          } else if (intervalUnit === 'hours') {
            scheduledFor.setHours(scheduledFor.getHours() + waveDelay);
          } else {
            scheduledFor.setDate(scheduledFor.getDate() + waveDelay);
          }

          // Create one batch per enrollment in this wave
          wave.forEach((enrollment) => {
            batches.push({
              enrollment_id: enrollment.id,
              batch_number: waveIndex + 1,
              scheduled_for: scheduledFor.toISOString(),
              status: 'pending',
              contacts_in_batch: [enrollment.contact_id],
            });
          });
        });
      } else {
        // IMMEDIATE or SCHEDULED MODE: Create one batch per enrollment, send ASAP
        createdEnrollments.forEach((enrollment) => {
          batches.push({
            enrollment_id: enrollment.id,
            batch_number: 1,
            scheduled_for: startTime.toISOString(),
            status: 'pending',
            contacts_in_batch: [enrollment.contact_id],
          });
        });
      }

      const { error: batchError } = await serviceClient
        .from('sequence_batch_queue')
        .insert(batches);

      if (batchError) {
        console.error('Error creating batches:', batchError);
        // Don't throw here, enrollments are already created
      } else {
        batchesCreated = batches.length;
        console.log(`Created ${batchesCreated} batch(es) for ${config.scheduling_mode} mode`);
      }
    }

    console.log('Enrollment complete:', {
      enrolled: createdEnrollments?.length || 0,
      alreadyEnrolled: alreadyEnrolledCount,
      batchesCreated,
    });

    const enrolledCount = createdEnrollments?.length || 0;
    let message = '';
    
    if (alreadyEnrolledCount > 0 && enrolledCount > 0) {
      message = `Added to automation: ${enrolledCount} enrolled • ${alreadyEnrolledCount} already enrolled`;
    } else if (alreadyEnrolledCount > 0) {
      message = `All ${alreadyEnrolledCount} contact(s) are already enrolled`;
    } else {
      message = `Successfully enrolled ${enrolledCount} contact(s)`;
    }

    if (batchesCreated > 0) {
      message += ` • ${batchesCreated} batch(es) scheduled`;
    }

    return new Response(
      JSON.stringify({
        enrolled: enrolledCount,
        alreadyEnrolled: alreadyEnrolledCount,
        batchesCreated,
        message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in sequence-enroll-contacts:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

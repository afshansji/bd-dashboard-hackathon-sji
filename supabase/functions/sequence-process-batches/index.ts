import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{${key}}`, 'g'), value || '');
  });
  return result;
}

function isWithinTimeWindow(
  timeWindowStart: string | null,
  timeWindowEnd: string | null
): boolean {
  if (!timeWindowStart || !timeWindowEnd) return true;

  const now = new Date();
  const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

  return currentTime >= timeWindowStart && currentTime <= timeWindowEnd;
}

function isAllowedDay(sendDays: string[] | null): boolean {
  if (!sendDays || sendDays.length === 0) return true;

  const daysMap: Record<string, number> = {
    'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
  };

  const now = new Date();
  const currentDay = now.getDay();
  
  return sendDays.some(day => daysMap[day] === currentDay);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('Processing sequence batches...');

    // Find pending batches that are due
    const { data: batches, error: batchError } = await supabase
      .from('sequence_batch_queue')
      .select(`
        *,
        enrollment:contact_sequence_enrollments(
          id,
          sequence_id,
          scheduling_mode,
          send_days,
          time_window_start,
          time_window_end,
          email_template_id,
          total_sent,
          sequence:campaign_sequences(
            id,
            name,
            campaign_id
          )
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(10);

    if (batchError) {
      throw batchError;
    }

    if (!batches || batches.length === 0) {
      console.log('No batches to process');
      return new Response(
        JSON.stringify({ message: 'No batches to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${batches.length} batches to process`);

    let processed = 0;
    let skipped = 0;

    for (const batch of batches) {
      const enrollment = batch.enrollment as any;
      
      // Check time and day constraints ONLY for drip mode
      // Immediate and scheduled modes should send regardless of time window
      const schedulingMode = enrollment.scheduling_mode || 'drip';
      const hasSendDays = enrollment.send_days && enrollment.send_days.length > 0;
      const hasTimeWindow = enrollment.time_window_start && enrollment.time_window_end;
      
      // Only enforce time restrictions if send_days or time_window are explicitly set
      if (hasSendDays && !isAllowedDay(enrollment.send_days)) {
        console.log(`Batch ${batch.id} skipped: Not an allowed day (${new Date().toLocaleDateString('en-US', { weekday: 'long' })})`);
        skipped++;
        continue;
      }

      if (hasTimeWindow && !isWithinTimeWindow(enrollment.time_window_start, enrollment.time_window_end)) {
        console.log(`Batch ${batch.id} skipped: Outside time window (${new Date().toTimeString().split(' ')[0].substring(0, 5)})`);
        skipped++;
        continue;
      }

      // Update batch status to processing
      await supabase
        .from('sequence_batch_queue')
        .update({ status: 'processing', started_at: new Date().toISOString() })
        .eq('id', batch.id);

      try {
        // Get email template
        const { data: template, error: templateError } = await supabase
          .from('email_templates')
          .select('*')
          .eq('id', enrollment.email_template_id)
          .single();

        if (templateError || !template) {
          throw new Error('Email template not found');
        }

        // Get contacts in batch
        const { data: contacts, error: contactsError } = await supabase
          .from('campaign_contacts')
          .select('*')
          .in('id', batch.contacts_in_batch);

        if (contactsError || !contacts) {
          throw new Error('Failed to fetch contacts');
        }

        let emailsSent = 0;
        let emailsFailed = 0;

        // Send emails to each contact
        for (const contact of contacts) {
          try {
            // Get user info for variable replacement
            const { data: campaign } = await supabase
              .from('bd_campaigns')
              .select('name, owned_by')
              .eq('id', enrollment.sequence.campaign_id)
              .single();

            const { data: owner } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', campaign?.owned_by)
              .single();

            // Replace variables in subject and body
            const variables = {
              'Contact Name': contact.contact_name || 'there',
              'Company': contact.current_employer || contact.contact_company || 'your company',
              'User Name': owner?.full_name || '',
              'Campaign Name': campaign?.name || '',
              'Title': contact.current_title || '',
            };

            const subject = replaceVariables(template.subject, variables);
            const body = replaceVariables(template.body, variables);

            // Send email via send-campaign-email function
            const { error: sendError } = await supabase.functions.invoke('send-campaign-email', {
              body: {
                to: contact.contact_email,
                subject,
                body,
                contactId: contact.id,
                campaignId: enrollment.sequence.campaign_id,
              },
            });

            if (sendError) {
              console.error(`Failed to send email to ${contact.contact_email}:`, sendError);
              emailsFailed++;
            } else {
              emailsSent++;
              
              // Log execution
              await supabase.from('sequence_execution_log').insert({
                enrollment_id: enrollment.id,
                step_id: null, // We'll need to add step tracking later
                status: 'success',
                executed_at: new Date().toISOString(),
                metadata: { batch_id: batch.id, contact_id: contact.id },
              });
            }
          } catch (emailError: any) {
            console.error(`Error sending to ${contact.contact_email}:`, emailError);
            emailsFailed++;
          }
        }

        // Update batch status
        await supabase
          .from('sequence_batch_queue')
          .update({
            status: emailsFailed === 0 ? 'completed' : 'failed',
            emails_sent: emailsSent,
            emails_failed: emailsFailed,
            completed_at: new Date().toISOString(),
            error_message: emailsFailed > 0 ? `${emailsFailed} emails failed` : null,
          })
          .eq('id', batch.id);

        // Update enrollment progress
        await supabase
          .from('contact_sequence_enrollments')
          .update({
            total_sent: enrollment.total_sent + emailsSent,
          })
          .eq('id', enrollment.id);

        processed++;
        console.log(`Batch ${batch.id} completed: ${emailsSent} sent, ${emailsFailed} failed`);

      } catch (batchProcessError: any) {
        console.error(`Error processing batch ${batch.id}:`, batchProcessError);
        
        // Mark batch as failed
        await supabase
          .from('sequence_batch_queue')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: batchProcessError.message,
          })
          .eq('id', batch.id);
      }
    }

    console.log(`Batch processing complete: ${processed} processed, ${skipped} skipped`);

    return new Response(
      JSON.stringify({
        message: 'Batch processing complete',
        processed,
        skipped,
        total: batches.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in sequence-process-batches:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
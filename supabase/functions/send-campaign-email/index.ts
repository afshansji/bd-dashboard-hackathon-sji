import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendEmailRequest {
  to: string;
  subject: string;
  body: string;
  contactId: string;
  campaignId: string;
  cc?: string[];
  bcc?: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body
    const { to, subject, body, contactId, campaignId, cc, bcc }: SendEmailRequest = await req.json();

    // Validate required fields
    if (!to || !subject || !body || !contactId || !campaignId) {
      throw new Error('Missing required fields');
    }

    console.log(`[send-campaign-email] Processing email for contact ${contactId}`);

    // Get user's profile for sender name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    const userName = profile?.full_name || 'SJ Innovation Team';
    const userEmail = profile?.email || '';

    // Get SendGrid API key
    const sendGridApiKey = Deno.env.get('SENDGRID_API_KEY');
    if (!sendGridApiKey) {
      throw new Error('SendGrid API key not configured');
    }

    // Prepare email payload
    const fromEmail = 'bd@sjinnovation.com';
    const fromName = `${userName} via SJ Innovation`;
    
    const emailPayload: any = {
      personalizations: [{
        to: [{ email: to }],
      }],
      from: {
        email: fromEmail,
        name: fromName
      },
      subject,
      content: [{
        type: 'text/html',
        value: body.replace(/\n/g, '<br>')
      }]
    };

    // Add reply-to if user has email
    if (userEmail) {
      emailPayload.reply_to = {
        email: userEmail,
        name: userName
      };
    }

    // Add CC if provided
    if (cc && cc.length > 0) {
      emailPayload.personalizations[0].cc = cc.map(email => ({ email }));
    }

    // Add BCC if provided
    if (bcc && bcc.length > 0) {
      emailPayload.personalizations[0].bcc = bcc.map(email => ({ email }));
    }

    // Send email via SendGrid
    const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendGridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    if (!sendGridResponse.ok) {
      const errorText = await sendGridResponse.text();
      console.error('[send-campaign-email] SendGrid error:', errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    // Get SendGrid message ID from response headers
    const messageId = sendGridResponse.headers.get('x-message-id') || undefined;

    console.log(`[send-campaign-email] Email sent successfully, message ID: ${messageId}`);

    // Get current contact status
    const { data: contact } = await supabase
      .from('campaign_contacts')
      .select('status')
      .eq('id', contactId)
      .single();

    const currentStatus = contact?.status || 'identified';

    // Determine if we should update status to 'contacted_email'
    const statusProgression = ['identified', 'researched', 'contacted_email', 'in_discussion', 'meeting_scheduled', 'proposal_sent', 'negotiation', 'won', 'lost'];
    const currentIndex = statusProgression.indexOf(currentStatus);
    const contactedIndex = statusProgression.indexOf('contacted_email');
    
    let newStatus = currentStatus;
    if (currentIndex < contactedIndex) {
      newStatus = 'contacted_email';
    }

    const sentAt = new Date().toISOString();

    // Log activity to status history
    await supabase
      .from('campaign_contact_status_history')
      .insert({
        contact_id: contactId,
        old_status: currentStatus,
        new_status: newStatus,
        changed_by: user.id,
        change_trigger: 'email_sent',
        notes: `Email sent: "${subject}"`
      });

    // Update contact status if changed
    if (newStatus !== currentStatus) {
      await supabase
        .from('campaign_contacts')
        .update({
          status: newStatus,
          last_status_change_at: sentAt,
          email_sent_at: sentAt,
          last_activity_at: sentAt,
        })
        .eq('id', contactId);
    } else {
      await supabase
        .from('campaign_contacts')
        .update({
          email_sent_at: sentAt,
          last_activity_at: sentAt,
        })
        .eq('id', contactId);
    }

    // Store email record
    await supabase
      .from('campaign_emails')
      .insert({
        contact_id: contactId,
        campaign_id: campaignId,
        sent_by: user.id,
        to_email: to,
        cc_emails: cc || null,
        bcc_emails: bcc || null,
        subject,
        body,
        sendgrid_message_id: messageId,
        status: 'sent'
      });

    console.log(`[send-campaign-email] Complete - email logged and status updated`);

    return new Response(
      JSON.stringify({ success: true, messageId }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[send-campaign-email] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

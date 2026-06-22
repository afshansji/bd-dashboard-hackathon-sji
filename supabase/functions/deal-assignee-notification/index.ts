import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders } from "../_shared/cors.ts";
import { sendEmail, checkNotificationPreferences } from "../_shared/notifications.ts";

const headers = { ...corsHeaders, "Content-Type": "application/json" } as const;

interface AssigneeNotificationPayload {
  deal_id: string;
  new_assignee_id: string;
  old_assignee_id: string | null;
  assignment_type: 'pm' | 'owner';
  changed_by_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const appUrl = Deno.env.get("APP_URL") || "https://bd.sjinnovation.com";

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[deal-assignee-notification] Server configuration error - missing env vars");
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const payload: AssigneeNotificationPayload = await req.json();
    const { deal_id, new_assignee_id, old_assignee_id, assignment_type, changed_by_id } = payload;

    console.log(`[deal-assignee-notification] Processing notification for deal ${deal_id}, assignment_type: ${assignment_type}`);

    // Don't send notification if no new assignee
    if (!new_assignee_id) {
      console.log("[deal-assignee-notification] No new assignee, skipping notification");
      return new Response(
        JSON.stringify({ success: true, message: "No notification needed - assignee removed" }),
        { status: 200, headers }
      );
    }

    // Don't send notification if assigning to themselves
    if (changed_by_id && changed_by_id === new_assignee_id) {
      console.log("[deal-assignee-notification] User assigned to themselves, skipping notification");
      return new Response(
        JSON.stringify({ success: true, message: "No notification needed - self-assignment" }),
        { status: 200, headers }
      );
    }

    // Get deal details
    const { data: dealRaw, error: dealError } = await supabase
      .from("deals")
      .select(`
        id,
        title,
        stage,
        slug,
        amount,
        client:clients(name)
      `)
      .eq("id", deal_id)
      .single();

    if (dealError || !dealRaw) {
      console.error("[deal-assignee-notification] Deal not found:", dealError);
      return new Response(
        JSON.stringify({ error: "Deal not found" }),
        { status: 404, headers }
      );
    }

    // Transform the raw data to match expected DealData interface
    // Supabase returns joined relations as arrays
    const deal: DealData = {
      id: dealRaw.id,
      title: dealRaw.title,
      stage: dealRaw.stage,
      slug: dealRaw.slug,
      value: dealRaw.amount,
      client: Array.isArray(dealRaw.client) && dealRaw.client.length > 0 
        ? { name: dealRaw.client[0].name } 
        : null,
    };

    // Get new assignee details from users table
    const { data: newAssignee, error: assigneeError } = await supabase
      .from("users")
      .select("id, email, first_name, last_name")
      .eq("id", new_assignee_id)
      .single();

    if (assigneeError || !newAssignee) {
      console.error("[deal-assignee-notification] Assignee not found in users table:", assigneeError);
      // Try profiles table as fallback
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("id", new_assignee_id)
        .single();

      if (profileError || !profile || !profile.email) {
        console.error("[deal-assignee-notification] Assignee not found in profiles either:", profileError);
        return new Response(
          JSON.stringify({ error: "Assignee not found" }),
          { status: 404, headers }
        );
      }

      // Use profile data
      const assigneeName = profile.full_name || profile.email.split('@')[0];
      const assigneeEmail = profile.email;

      // Check notification preferences
      const notificationType = assignment_type === 'pm' ? 'deal_pm_assigned' : 'deal_owner_assigned';
      const shouldNotify = await checkNotificationPreferences(supabase, new_assignee_id, notificationType);

      if (!shouldNotify) {
        console.log(`[deal-assignee-notification] User ${new_assignee_id} has disabled ${notificationType} notifications`);
        return new Response(
          JSON.stringify({ success: true, message: "Notification disabled by user preferences" }),
          { status: 200, headers }
        );
      }

      // Send email notification (if preferences allow)
      await sendAssigneeNotification(
        assigneeEmail,
        assigneeName,
        deal,
        assignment_type,
        appUrl
      );

      // Create in-app notification (always created, regardless of email preferences)
      await createInAppNotification(
        supabase,
        new_assignee_id,
        deal,
        assignment_type,
        appUrl
      );

      return new Response(
        JSON.stringify({ success: true, message: "Notification sent successfully" }),
        { status: 200, headers }
      );
    }

    const assigneeName = [newAssignee.first_name, newAssignee.last_name].filter(Boolean).join(' ') || newAssignee.email.split('@')[0];
    const assigneeEmail = newAssignee.email;

    // Check notification preferences
    const notificationType = assignment_type === 'pm' ? 'deal_pm_assigned' : 'deal_owner_assigned';
    const shouldNotify = await checkNotificationPreferences(supabase, new_assignee_id, notificationType);

    // Send email notification (only if preferences allow)
    if (shouldNotify) {
      await sendAssigneeNotification(
        assigneeEmail,
        assigneeName,
        deal,
        assignment_type,
        appUrl
      );
      console.log(`[deal-assignee-notification] Email sent to ${assigneeEmail} for deal ${deal_id}`);
    } else {
      console.log(`[deal-assignee-notification] User ${new_assignee_id} has disabled ${notificationType} email notifications`);
    }

    // Create in-app notification (always created, regardless of email preferences)
    await createInAppNotification(
      supabase,
      new_assignee_id,
      deal,
      assignment_type,
      appUrl
    );

    console.log(`[deal-assignee-notification] In-app notification created for user ${new_assignee_id}, deal ${deal_id}`);

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent successfully" }),
      { status: 200, headers }
    );

  } catch (error) {
    console.error("[deal-assignee-notification] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers }
    );
  }
});

interface DealData {
  id: string;
  title: string;
  stage?: string;
  slug?: string;
  value?: number;
  client?: { name: string } | null;
  company?: { name: string } | null;
}

async function sendAssigneeNotification(
  email: string,
  name: string,
  deal: DealData,
  assignmentType: 'pm' | 'owner',
  appUrl: string
): Promise<void> {
  const roleLabel = assignmentType === 'pm' ? 'Project Manager' : 'Deal Owner';
  const clientOrCompanyName = deal.client?.name || deal.company?.name || 'Unknown Client';
  const dealUrl = `${appUrl}/bd/deals/${deal.id}`;

  const formatCurrency = (value: number | undefined) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const formatStage = (stage: string | undefined) => {
    if (!stage) return 'N/A';
    return stage.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const subject = `You've been assigned as ${roleLabel} for "${deal.title}"`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">New Deal Assignment</h1>
      </div>

      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef; border-top: none;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hi ${name},</p>

        <p style="font-size: 16px; margin-bottom: 20px;">
          You have been assigned as the <strong>${roleLabel}</strong> for the following deal:
        </p>

        <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e9ecef; margin-bottom: 25px;">
          <h2 style="margin: 0 0 15px 0; color: #333; font-size: 20px;">${deal.title}</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 120px;">Client:</td>
              <td style="padding: 8px 0; font-weight: 500;">${clientOrCompanyName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Stage:</td>
              <td style="padding: 8px 0; font-weight: 500;">${formatStage(deal.stage)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Value:</td>
              <td style="padding: 8px 0; font-weight: 500;">${formatCurrency(deal.value)}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin-bottom: 25px;">
          <a href="${dealUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; font-size: 16px;">
            View Deal Details
          </a>
        </div>

        <p style="color: #666; font-size: 14px; margin-bottom: 0;">
          This is an automated notification from SJI Business Development Dashboard.
        </p>
      </div>

      <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
        <p style="margin: 0;">You received this email because you were assigned to a deal.</p>
        <p style="margin: 5px 0 0 0;">To manage your notification preferences, visit your profile settings.</p>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject,
    html,
    fromName: 'SJI BD Dashboard',
  });
}

/**
 * Creates an in-app notification for the assigned user
 */
async function createInAppNotification(
  supabase: any,
  userId: string,
  deal: DealData,
  assignmentType: 'pm' | 'owner',
  appUrl: string
): Promise<void> {
  const roleLabel = assignmentType === 'pm' ? 'Project Manager' : 'Deal Owner';
  const clientOrCompanyName = deal.client?.name || deal.company?.name || 'Unknown Client';
  const dealUrl = `${appUrl}/bd/deals/${deal.id}`;

  const formatCurrency = (value: number | undefined) => {
    if (!value) return '';
    return ` (${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)})`;
  };

  const title = `New ${roleLabel} Assignment`;
  const message = `You've been assigned as ${roleLabel} for "${deal.title}" - ${clientOrCompanyName}${formatCurrency(deal.value)}`;

  const { error } = await supabase
    .from('user_notifications')
    .insert({
      user_id: userId,
      type: assignmentType === 'pm' ? 'deal_pm_assigned' : 'deal_owner_assigned',
      title,
      message,
      data: {
        deal_id: deal.id,
        deal_title: deal.title,
        assignment_type: assignmentType,
        client_name: clientOrCompanyName,
        deal_value: deal.value,
        deal_stage: deal.stage
      },
      link: `/${deal.stage}/${deal.slug || deal.id}`,
      read: false
    });

  if (error) {
    console.error('[deal-assignee-notification] Failed to create in-app notification:', error);
    throw error;
  }

  console.log(`[deal-assignee-notification] In-app notification created for user ${userId}`);
}

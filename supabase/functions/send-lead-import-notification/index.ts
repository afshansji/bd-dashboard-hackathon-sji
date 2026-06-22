import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders } from "../_shared/cors.ts";

const headers = { ...corsHeaders, "Content-Type": "application/json" } as const;

interface NotificationPayload {
  jobId: string;
  campaignId: string;
  results: {
    imported: number;
    updated: number;
    total: number;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const frontendUrl = Deno.env.get("VITE_SUPABASE_URL")?.replace("/functions/v1", "") || "https://yourapp.com";

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { jobId, campaignId, results }: NotificationPayload = await req.json();

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from("lead_import_jobs")
      .select("*, user_id")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      console.error("[send-notification] Job not found:", jobError);
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        { status: 404, headers }
      );
    }

    // Get user email
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(job.user_id);
    
    if (authError || !authUser?.user?.email) {
      console.error("[send-notification] User not found:", authError);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers }
      );
    }

    const notifyEmail = job.notify_email || authUser.user.email;

    // Get campaign details
    const { data: campaign } = await supabase
      .from("bd_campaigns")
      .select("name")
      .eq("id", campaignId)
      .single();

    const campaignName = campaign?.name || "Your Campaign";

    // Create simple email notification
    console.log(`[send-notification] Would send email to: ${notifyEmail}`);
    console.log(`Campaign: ${campaignName}`);
    console.log(`Results: ${JSON.stringify(results)}`);
    console.log(`Link: ${frontendUrl}/bd/strategy/campaigns/${campaignId}`);

    // TODO: Integrate with Resend when RESEND_API_KEY is configured
    // For now, just log the notification
    
    // Mark notification sent
    await supabase
      .from("lead_import_jobs")
      .update({ notification_sent_at: new Date().toISOString() })
      .eq("id", jobId);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Notification logged (email integration pending)"
      }),
      { status: 200, headers }
    );

  } catch (error) {
    console.error("[send-notification] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers }
    );
  }
});

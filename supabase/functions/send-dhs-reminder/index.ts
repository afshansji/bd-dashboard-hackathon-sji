import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[send-dhs-reminder] Starting DHS reminder process");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split("T")[0];

    // Get all active users
    const { data: allUsers, error: usersError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .not("id", "is", null);

    if (usersError) {
      console.error("[send-dhs-reminder] Error fetching users:", usersError);
      throw usersError;
    }

    console.log(`[send-dhs-reminder] Found ${allUsers?.length || 0} users to check`);

    // Get today's DHS submissions
    const { data: todaySubmissions, error: submissionsError } = await supabase
      .from("dhs_submissions")
      .select("user_id")
      .eq("date", today);

    if (submissionsError) {
      console.error("[send-dhs-reminder] Error fetching submissions:", submissionsError);
      throw submissionsError;
    }

    const submittedUserIds = new Set(todaySubmissions?.map((s) => s.user_id) || []);
    console.log(`[send-dhs-reminder] ${submittedUserIds.size} users have already submitted DHS today`);

    // Find users who haven't submitted
    const usersToNotify = allUsers?.filter((user) => !submittedUserIds.has(user.id)) || [];
    console.log(`[send-dhs-reminder] ${usersToNotify.length} users need reminders`);

    if (usersToNotify.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "All users have submitted DHS for today",
          notified: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create in-app notifications for users who haven't submitted
    const notifications = usersToNotify.map((user) => ({
      user_id: user.id,
      type: "dhs_reminder",
      title: "Daily Head Start Reminder",
      message: "Don't forget to submit your Daily Head Start (DHS) for today! Track your BD activities and plan your day.",
      link: "/bd/actions/dhs",
      read: false,
    }));

    const { error: notificationError } = await supabase
      .from("user_notifications")
      .insert(notifications);

    if (notificationError) {
      console.error("[send-dhs-reminder] Error creating notifications:", notificationError);
      throw notificationError;
    }

    console.log(`[send-dhs-reminder] Successfully created ${notifications.length} notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `DHS reminders sent to ${notifications.length} users`,
        notified: notifications.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[send-dhs-reminder] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


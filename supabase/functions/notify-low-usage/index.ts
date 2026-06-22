import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const inactivityDays = Number(url.searchParams.get("days") || 7);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - inactivityDays);

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, email");

    if (profilesError) {
      throw profilesError;
    }

    const users = (profiles || []) as ProfileRow[];
    if (users.length === 0) {
      return new Response(JSON.stringify({ notifiedCount: 0, inactiveCount: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: recentActivity, error: activityError } = await supabase
      .from("user_activity_log")
      .select("user_id")
      .gte("created_at", cutoffDate.toISOString());

    if (activityError) {
      throw activityError;
    }

    const activeUserIds = new Set((recentActivity || []).map((row: any) => row.user_id));
    const inactiveUsers = users.filter((user) => !activeUserIds.has(user.id));

    if (inactiveUsers.length === 0) {
      return new Response(
        JSON.stringify({ notifiedCount: 0, inactiveCount: 0, skippedCount: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const inactiveUserIds = inactiveUsers.map((user) => user.id);
    const { data: recentNotifications, error: notificationError } = await supabase
      .from("user_notifications")
      .select("user_id")
      .eq("type", "LOW_USAGE")
      .gte("created_at", cutoffDate.toISOString())
      .in("user_id", inactiveUserIds);

    if (notificationError) {
      throw notificationError;
    }

    const recentlyNotified = new Set((recentNotifications || []).map((row: any) => row.user_id));
    const notifyUsers = inactiveUsers.filter((user) => !recentlyNotified.has(user.id));

    const notifications = notifyUsers.map((user) => ({
      user_id: user.id,
      type: "LOW_USAGE",
      title: "We miss you in SJ BD Dashboard",
      message: `You have not logged any activity in the last ${inactivityDays} days. Please check in and update your progress.`,
      data: {
        days_inactive: inactivityDays,
        last_checked_at: new Date().toISOString(),
      },
      link_url: "/bd",
    }));

    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from("user_notifications")
        .insert(notifications);

      if (insertError) {
        throw insertError;
      }
    }

    const response = {
      notifiedCount: notifications.length,
      inactiveCount: inactiveUsers.length,
      skippedCount: inactiveUsers.length - notifications.length,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[notify-low-usage] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

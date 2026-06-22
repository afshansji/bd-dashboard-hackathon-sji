import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/notifications.ts";
import { buildProviderChain, invokeProvider } from "../_shared/providers.ts";

const headers = { ...corsHeaders, "Content-Type": "application/json" } as const;

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_review: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

const TYPE_LABELS: Record<string, string> = {
  bug: "Bug",
  feature: "Feature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const appUrl = Deno.env.get("APP_URL") || "https://bd.sjinnovation.com";
  const cronSecret = Deno.env.get("CRON_SECRET");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[weekly-feedback-summary] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers,
    });
  }

  if (cronSecret) {
    const providedSecret = req.headers.get("x-cron-secret");
    if (providedSecret !== cronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers,
      });
    }
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: feedback, error: feedbackError } = await supabase
      .from("feedback_reports")
      .select("id, type, subject, status, priority, module, feedback_number, upvote_count, updated_at, created_at")
      .gte("updated_at", since)
      .order("updated_at", { ascending: false });

    if (feedbackError) {
      console.error("[weekly-feedback-summary] Failed to fetch feedback", feedbackError);
      return new Response(JSON.stringify({ error: "Failed to fetch feedback" }), {
        status: 500,
        headers,
      });
    }

    const items = feedback ?? [];

    const stats = items.reduce(
      (acc, item) => {
        acc.total += 1;
        acc.byType[item.type] = (acc.byType[item.type] ?? 0) + 1;
        acc.byStatus[item.status] = (acc.byStatus[item.status] ?? 0) + 1;
        return acc;
      },
      {
        total: 0,
        byType: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
      },
    );

    const summaryInput = items
      .slice(0, 60)
      .map((item) => {
        const number = item.feedback_number ? `#${item.feedback_number}` : "";
        return `• ${TYPE_LABELS[item.type] ?? item.type} ${number} - ${item.subject} (status: ${item.status}, priority: ${item.priority ?? "none"}, module: ${item.module ?? "unassigned"}, upvotes: ${item.upvote_count ?? 0})`;
      })
      .join("\n");

    let aiSummary = "No feedback updates were recorded this week.";

    if (items.length > 0) {
      const providerChain = buildProviderChain({}, "google/gemini-2.5-flash");
      let summaryGenerated = false;

      for (const providerConfig of providerChain) {
        const result = await invokeProvider(providerConfig, [
          {
            role: "system",
            content: "You are an executive assistant summarizing internal product feedback for leadership.",
          },
          {
            role: "user",
            content: `Summarize the weekly feedback updates from the internal dashboard. Focus on trends, priority issues, and recurring modules. Provide 4-6 bullet points with actionable insights.\n\nFeedback updates:\n${summaryInput}`,
          },
        ]);

        if (!result.telemetry.error && result.content.trim().length > 0) {
          aiSummary = result.content.trim();
          summaryGenerated = true;
          console.log("[weekly-feedback-summary] AI summary generated via", result.telemetry.provider, result.telemetry.model, result.telemetry.tokenUsage ?? {});
          break;
        }

        console.warn("[weekly-feedback-summary] Provider failed", result.telemetry);
      }

      if (!summaryGenerated) {
        aiSummary = "Summary generation failed. Please review recent feedback manually.";
      }
    }

    const { data: adminRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "super_admin");

    if (rolesError) {
      console.error("[weekly-feedback-summary] Failed to fetch admin roles", rolesError);
      return new Response(JSON.stringify({ error: "Failed to fetch recipients" }), {
        status: 500,
        headers,
      });
    }

    const adminIds = (adminRoles ?? []).map((row) => row.user_id);

    if (adminIds.length === 0) {
      console.warn("[weekly-feedback-summary] No super admins found");
      return new Response(JSON.stringify({ success: true, message: "No recipients" }), {
        status: 200,
        headers,
      });
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", adminIds);

    if (profilesError) {
      console.error("[weekly-feedback-summary] Failed to fetch admin profiles", profilesError);
      return new Response(JSON.stringify({ error: "Failed to fetch recipients" }), {
        status: 500,
        headers,
      });
    }

    const formattedItems = items
      .slice(0, 50)
      .map((item) => {
        const link = `${appUrl}/feedback/${item.id}`;
        return `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">
              <strong>${TYPE_LABELS[item.type] ?? item.type} ${item.feedback_number ? `#${item.feedback_number}` : ""}</strong><br />
              <span style="color:#555;">${item.subject}</span>
            </td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">${STATUS_LABELS[item.status] ?? item.status}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">${item.module ?? "Unassigned"}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">${item.priority ?? "—"}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">${item.upvote_count ?? 0}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;"><a href="${link}">View</a></td>
          </tr>
        `;
      })
      .join("");

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; color: #1f2937;">
        <h2>Weekly Feedback Summary</h2>
        <p>Here is the latest snapshot of feedback activity over the past 7 days.</p>
        <h3>Summary Stats</h3>
        <ul>
          <li><strong>Total updates:</strong> ${stats.total}</li>
          <li><strong>Bugs:</strong> ${stats.byType.bug ?? 0}</li>
          <li><strong>Features:</strong> ${stats.byType.feature ?? 0}</li>
          <li><strong>Open:</strong> ${stats.byStatus.open ?? 0}</li>
          <li><strong>In Progress:</strong> ${stats.byStatus.in_review ?? 0}</li>
          <li><strong>Resolved:</strong> ${stats.byStatus.resolved ?? 0}</li>
        </ul>
        <h3>AI Summary</h3>
        <div style="white-space: pre-line; background: #f9fafb; padding: 12px; border-radius: 8px;">
          ${aiSummary}
        </div>
        <h3>Recent Feedback</h3>
        <table style="width:100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr>
              <th style="text-align:left; padding:8px 12px; border-bottom:1px solid #ddd;">Item</th>
              <th style="text-align:left; padding:8px 12px; border-bottom:1px solid #ddd;">Status</th>
              <th style="text-align:left; padding:8px 12px; border-bottom:1px solid #ddd;">Module</th>
              <th style="text-align:left; padding:8px 12px; border-bottom:1px solid #ddd;">Priority</th>
              <th style="text-align:left; padding:8px 12px; border-bottom:1px solid #ddd;">Upvotes</th>
              <th style="text-align:left; padding:8px 12px; border-bottom:1px solid #ddd;">Link</th>
            </tr>
          </thead>
          <tbody>
            ${formattedItems || "<tr><td colspan=\"6\" style=\"padding:12px;\">No updates this week.</td></tr>"}
          </tbody>
        </table>
      </div>
    `;

    const recipients = profiles
      ?.map((profile) => profile.email)
      .filter((email): email is string => Boolean(email)) ?? [];

    if (recipients.length === 0) {
      console.warn("[weekly-feedback-summary] No emails found for super admins");
      return new Response(JSON.stringify({ success: true, message: "No email recipients" }), {
        status: 200,
        headers,
      });
    }

    await Promise.all(
      recipients.map((email) =>
        sendEmail({
          to: email,
          subject: "Weekly Feedback Summary",
          html: emailHtml,
        }),
      ),
    );

    return new Response(JSON.stringify({ success: true, recipients: recipients.length }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("[weekly-feedback-summary] Unexpected error", error);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers,
    });
  }
});

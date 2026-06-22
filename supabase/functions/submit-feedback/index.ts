import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../_shared/cors.ts";

type FeatureFlags = {
  feedback_enabled?: boolean;
  feedback_auto_email?: boolean;
  feedback_widget?: boolean;
};

interface FeatureFlagRow {
  configuration_data: Record<string, unknown> | null;
}

interface AttachmentInfo {
  fileName: string;
  filePath: string;
  fileSize?: number;
  contentType?: string;
}

interface SubmitFeedbackRequest {
  id?: string;
  type?: string;
  subject?: string;
  description?: string;
  module?: string | null;
  attachmentPath?: string | null; // Legacy single attachment support
  attachmentName?: string | null; // Legacy single attachment support
  attachments?: AttachmentInfo[]; // New multiple attachments support
}

async function getFeatureFlags(client: any): Promise<FeatureFlags> {
  const { data, error } = await client
    .from("ai_configurations")
    .select("configuration_data")
    .eq("configuration_type", "feature_flags");

  if (error) {
    console.error("Failed to load feature flags", error);
    return {};
  }

  const rows = (data ?? []) as unknown as FeatureFlagRow[];

  return rows.reduce<FeatureFlags>((acc, entry) => ({
    ...acc,
    ...(entry.configuration_data ?? {}),
  }), {});
}

async function sendThankYouEmail(to: string | null, subject: string, type: string) {
  if (!to) return false;

  const apiKey = Deno.env.get("MAILGUN_API_KEY");
  const domain = Deno.env.get("MAILGUN_DOMAIN");
  const fromEmail = Deno.env.get("MAILGUN_FROM_EMAIL") ?? `feedback@${domain ?? "example.com"}`;

  if (!apiKey || !domain) {
    console.warn("Mailgun not configured; skipping thank-you email.");
    return false;
  }

  const params = new URLSearchParams();
  params.append("from", fromEmail);
  params.append("to", to);
  params.append("subject", "Thanks for your feedback");
  params.append(
    "text",
    `Hi there!\n\nThanks for submitting a ${type} report titled "${subject}". Our admin team has received it and will follow up if anything else is needed.\n\n— SJ Innovation Platform Team`,
  );

  const auth = `Basic ${btoa(`api:${apiKey}`)}`;
  const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: auth,
    },
    body: params,
  });

  if (!response.ok) {
    console.error("Failed to send thank-you email", await response.text());
    return false;
  }

  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ message: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Extract JWT token from Authorization header
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    console.log("[submit-feedback] Auth header present:", !!authHeader);
    console.log("[submit-feedback] Auth header preview:", authHeader.substring(0, 20));

    const userClient = createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser(token);

    console.log("[submit-feedback] User auth - Success:", !!user, "Error:", authError?.message);

    if (authError || !user) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: SubmitFeedbackRequest = await req.json();
    const type = body.type?.toLowerCase();
    const subject = body.subject?.trim();

    console.log("[submit-feedback] Received request:", { type, hasSubject: !!subject, userId: user.id });

    if (!type || !["bug", "feature"].includes(type)) {
      console.error("[submit-feedback] Invalid type received:", body.type);
      return new Response(JSON.stringify({ 
        message: "Invalid feedback type. Must be 'bug' or 'feature'.",
        received: body.type 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!subject) {
      console.error("[submit-feedback] Missing subject");
      return new Response(JSON.stringify({ message: "Subject is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const featureFlags = await getFeatureFlags(serviceClient);

    if (featureFlags.feedback_enabled === false) {
      return new Response(JSON.stringify({ message: "Feedback module is disabled" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const id = body.id ?? crypto.randomUUID();
    const module = typeof body.module === "string" && body.module.trim().length > 0
      ? body.module.trim()
      : null;
    
    // Insert feedback report
    const { data, error } = await serviceClient
      .from("feedback_reports")
      .insert({
        id,
        type,
        subject,
        description: body.description ?? null,
        status: "open",
        email: user.email ?? "",
        attachment_url: body.attachmentPath ?? null, // Legacy support for single attachment
        created_by: user.id,
        module,
      })
      .select("id, status")
      .single();

    if (error) {
      console.error("[submit-feedback] Database insert failed:", error);
      return new Response(JSON.stringify({ 
        message: "Unable to save feedback",
        error: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[submit-feedback] Successfully created feedback:", data.id);

    // Insert multiple attachments if provided
    if (body.attachments && body.attachments.length > 0) {
      const attachmentRecords = body.attachments.map((att) => ({
        feedback_id: id,
        file_name: att.fileName,
        file_path: att.filePath,
        file_size: att.fileSize ?? null,
        content_type: att.contentType ?? null,
      }));

      const { error: attachmentsError } = await serviceClient
        .from("feedback_attachments")
        .insert(attachmentRecords);

      if (attachmentsError) {
        console.error("[submit-feedback] Failed to insert attachments:", attachmentsError);
        // Don't fail the entire request, just log the error
      } else {
        console.log(`[submit-feedback] Successfully inserted ${attachmentRecords.length} attachments`);
      }
    }

    if (featureFlags.feedback_auto_email) {
      try {
        await sendThankYouEmail(user.email ?? null, subject, type);
      } catch (emailError) {
        console.error("Failed to send thank-you email", emailError);
      }
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error in submit-feedback", error);
    return new Response(JSON.stringify({ message: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

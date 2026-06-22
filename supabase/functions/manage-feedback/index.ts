import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../_shared/cors.ts";

const ALLOWED_STATUSES = ["open", "in_review", "resolved", "closed"] as const;
type FeedbackStatus = (typeof ALLOWED_STATUSES)[number];

const ALLOWED_PRIORITIES = ["low", "medium", "high"] as const;
type FeedbackPriority = (typeof ALLOWED_PRIORITIES)[number];

type SupabaseClient = ReturnType<typeof createClient>;

interface FeedbackReportRow {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  status: string;
  priority: string | null;
  module: string | null;
  feedback_number: number | null;
  upvote_count: number | null;
  email: string | null;
  attachment_url: string | null;
  created_by: string;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface FeedbackCommentRow {
  id: string;
  feedback_id: string;
  user_id: string;
  comment: string;
  created_at: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
}

async function getTopRole(client: any, userId: string): Promise<string | null> {
  const { data, error } = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Array<{ role: string }>;
  return rows.length > 0 ? rows[0].role : null;
}

async function assertAdmin(client: any, userId: string) {
  const role = await getTopRole(client, userId);
  if (role !== "super_admin") {
    throw new Error("Insufficient privileges");
  }
}

async function assertAtLeastAdmin(client: any, userId: string) {
  const role = await getTopRole(client, userId);
  if (!role || !["admin", "super_admin"].includes(role)) {
    throw new Error("Insufficient privileges");
  }
}

// Any authenticated user can perform this action (internal portal)
async function assertAuthenticated(_client: any, _userId: string) {
  // No role check - just being authenticated is enough
  return true;
}
async function fetchProfileMap(client: any, userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, { name: string | null; email: string | null }>();
  }

  const { data, error } = await client
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);

  if (error) {
    console.error("Failed to fetch profiles", error);
    return new Map();
  }

  const profiles = (data ?? []) as unknown as ProfileRow[];
  const map = new Map<string, { name: string | null; email: string | null }>();
  for (const profile of profiles) {
    map.set(profile.id, {
      name: profile.full_name ?? profile.email ?? null,
      email: profile.email ?? null,
    });
  }
  return map;
}

async function fetchCommentCounts(client: any, feedbackIds: string[]) {
  if (feedbackIds.length === 0) {
    return new Map<string, number>();
  }

  const { data, error } = await client
    .from("feedback_comments")
    .select("feedback_id")
    .in("feedback_id", feedbackIds);

  if (error) {
    console.error("Failed to fetch comment counts", error);
    return new Map();
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const feedbackId = (row as { feedback_id?: string }).feedback_id;
    if (!feedbackId) continue;
    counts.set(feedbackId, (counts.get(feedbackId) ?? 0) + 1);
  }

  return counts;
}

async function fetchUpvoteStatus(client: any, feedbackId: string, userId: string) {
  const { data, error } = await client
    .from("feedback_upvotes")
    .select("feedback_id")
    .eq("feedback_id", feedbackId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch upvote status", error);
    return false;
  }

  return !!data;
}

function parseRoute(req: Request) {
  const url = new URL(req.url);
  const segments = url.pathname.split("/").filter(Boolean);
  console.log("[parseRoute] All segments:", JSON.stringify(segments));
  const functionIndex = segments.findIndex((segment) => segment === "manage-feedback");
  console.log("[parseRoute] Function index:", functionIndex);
  const routeSegments = functionIndex >= 0 ? segments.slice(functionIndex + 1) : [];
  console.log("[parseRoute] Route segments:", JSON.stringify(routeSegments));
  return { url, routeSegments };
}

async function handleList(client: any, url: URL) {
  const type = url.searchParams.get("type");
  const status = url.searchParams.get("status");
  const statuses = url.searchParams.get("statuses"); // Support multiple statuses as comma-separated
  const includeClosed = url.searchParams.get("includeClosed") === "true";
  const module = url.searchParams.get("module");
  const search = url.searchParams.get("search");

  let query = client
    .from("feedback_reports")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (type) {
    query = query.eq("type", type);
  }

  if (module) {
    query = query.eq("module", module);
  }

  // Support multiple statuses via comma-separated string
  if (statuses) {
    const statusArray = statuses.split(",").map(s => s.trim()).filter(Boolean);
    if (statusArray.length > 0) {
      query = query.in("status", statusArray);
    }
  } else if (status) {
    query = query.eq("status", status);
  }

  // Exclude closed unless explicitly requested OR status is already 'closed'
  if (!includeClosed && status !== 'closed' && !statuses?.includes('closed')) {
    query = query.is("deleted_at", null).neq("status", "closed");
  }

  if (search) {
    query = query.ilike("subject", `%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Failed to list feedback", error);
    return new Response(JSON.stringify({ message: "Unable to load feedback" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const records = (data ?? []) as unknown as FeedbackReportRow[];
  const feedbackIds = records.map((record) => record.id);
  const userIds = Array.from(
    new Set([
      ...records.map((record) => record.created_by).filter((value): value is string => Boolean(value)),
      ...records.map((record) => record.reviewed_by).filter((value): value is string => Boolean(value)),
    ]),
  );

  const profileMap = await fetchProfileMap(client, userIds);
  const commentCounts = await fetchCommentCounts(client, feedbackIds);

  const items = records.map((record) => ({
    ...record,
    submitted_by_name: profileMap.get(record.created_by ?? "")?.name ?? null,
    reviewed_by_name: profileMap.get(record.reviewed_by ?? "")?.name ?? null,
    comment_count: commentCounts.get(record.id) ?? 0,
  }));

  return new Response(JSON.stringify({ items, total: count ?? records.length }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleDetail(client: any, id: string, userId: string) {
  const { data: feedback, error } = await client
    .from("feedback_reports")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load feedback", error);
    return new Response(JSON.stringify({ message: "Unable to load feedback" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!feedback) {
    return new Response(JSON.stringify({ message: "Feedback not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const report = feedback as unknown as FeedbackReportRow;

  const { data: comments, error: commentsError } = await client
    .from("feedback_comments")
    .select("*")
    .eq("feedback_id", id)
    .order("created_at", { ascending: true });

  if (commentsError) {
    console.error("Failed to load comments", commentsError);
    return new Response(JSON.stringify({ message: "Unable to load comments" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const commentRows = (comments ?? []) as unknown as FeedbackCommentRow[];

  const userIds = Array.from(
    new Set([
      report.created_by,
      report.reviewed_by,
      ...commentRows.map((comment) => comment.user_id),
    ].filter((value): value is string => Boolean(value))),
  );

  const profileMap = await fetchProfileMap(client, userIds);

  // Legacy single attachment support
  let attachmentSignedUrl: string | null = null;
  if (report.attachment_url) {
    const { data: signedUrlData, error: signedUrlError } = await client
      .storage
      .from("feedback")
      .createSignedUrl(report.attachment_url, 60 * 60);

    if (!signedUrlError) {
      attachmentSignedUrl = signedUrlData?.signedUrl ?? null;
    }
  }

  // Fetch multiple attachments from new table
  const { data: attachmentsData, error: attachmentsError } = await client
    .from("feedback_attachments")
    .select("*")
    .eq("feedback_id", id)
    .order("created_at", { ascending: true });

  const attachments = [];
  if (!attachmentsError && attachmentsData && attachmentsData.length > 0) {
    for (const att of attachmentsData) {
      const { data: signedUrlData, error: signedUrlError } = await client
        .storage
        .from("feedback")
        .createSignedUrl(att.file_path, 60 * 60);

      if (!signedUrlError && signedUrlData?.signedUrl) {
        attachments.push({
          id: att.id,
          fileName: att.file_name,
          fileSize: att.file_size,
          contentType: att.content_type,
          signedUrl: signedUrlData.signedUrl,
          createdAt: att.created_at,
        });
      }
    }
  }

  const mappedFeedback = {
    ...report,
    submitted_by_name: profileMap.get(report.created_by ?? "")?.name ?? null,
    reviewed_by_name: profileMap.get(report.reviewed_by ?? "")?.name ?? null,
    comment_count: commentRows.length,
  };

  const mappedComments = commentRows.map((comment) => ({
    ...comment,
    author_name: profileMap.get(comment.user_id ?? "")?.name ?? null,
    author_email: profileMap.get(comment.user_id ?? "")?.email ?? null,
  }));

  const hasUpvoted = await fetchUpvoteStatus(client, id, userId);

  return new Response(
    JSON.stringify({
      feedback: mappedFeedback,
      comments: mappedComments,
      has_upvoted: hasUpvoted,
      attachment_signed_url: attachmentSignedUrl, // Legacy support
      attachments: attachments.length > 0 ? attachments : undefined, // New multiple attachments
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

async function handleComment(client: any, id: string, userId: string, body: unknown) {
  const comment =
    typeof body === "object" && body !== null && "comment" in body && typeof (body as { comment?: unknown }).comment === "string"
      ? ((body as { comment: string }).comment || "").trim()
      : "";
  if (!comment) {
    return new Response(JSON.stringify({ message: "Comment text is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data, error } = await client
    .from("feedback_comments")
    .insert({ feedback_id: id, user_id: userId, comment })
    .select("*")
    .single();

  if (error) {
    console.error("Failed to add comment", error);
    return new Response(JSON.stringify({ message: "Unable to add comment" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(data as unknown as FeedbackCommentRow), {
    status: 201,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleStatus(client: any, id: string, userId: string, body: unknown) {
  const status =
    typeof body === "object" && body !== null && "status" in body && typeof (body as { status?: unknown }).status === "string"
      ? ((body as { status: string }).status || "").toLowerCase()
      : "";
  if (!ALLOWED_STATUSES.includes(status as FeedbackStatus)) {
    return new Response(JSON.stringify({ message: "Invalid status" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data, error } = await client
    .from("feedback_reports")
    .update({ status, reviewed_by: userId })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to update status", error);
    return new Response(JSON.stringify({ message: "Unable to update status" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(data as unknown as FeedbackReportRow), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handlePriority(client: any, id: string, userId: string, body: unknown) {
  const priority =
    typeof body === "object" && body !== null && "priority" in body
      ? (body as { priority?: unknown }).priority
      : undefined;
  
  console.log("[handlePriority] Received priority value:", priority, "Type:", typeof priority);
  
  // Allow null or valid priority values
  if (priority !== null && priority !== undefined) {
    if (typeof priority !== "string" || !ALLOWED_PRIORITIES.includes(priority as FeedbackPriority)) {
      console.error("[handlePriority] Invalid priority value:", priority);
      return new Response(JSON.stringify({ message: "Invalid priority. Must be 'low', 'medium', 'high', or null" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const updateValue = priority === undefined ? null : (priority as string | null);
  console.log("[handlePriority] Updating priority to:", updateValue);

  const { data, error } = await client
    .from("feedback_reports")
    .update({ priority: updateValue, reviewed_by: userId })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("[handlePriority] Database error:", error);
    return new Response(JSON.stringify({ 
      message: "Unable to update priority", 
      error: error.message,
      details: error.details,
      hint: error.hint 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log("[handlePriority] Successfully updated priority");
  return new Response(JSON.stringify(data as unknown as FeedbackReportRow), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleModule(client: any, id: string, userId: string, body: unknown) {
  const module =
    typeof body === "object" && body !== null && "module" in body
      ? (body as { module?: unknown }).module
      : undefined;

  const normalizedModule = typeof module === "string" && module.trim().length > 0 ? module.trim() : null;

  const { data, error } = await client
    .from("feedback_reports")
    .update({ module: normalizedModule, reviewed_by: userId })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to update module", error);
    return new Response(JSON.stringify({ message: "Unable to update module" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(data as unknown as FeedbackReportRow), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function updateUpvoteCount(client: any, feedbackId: string) {
  const { count, error } = await client
    .from("feedback_upvotes")
    .select("feedback_id", { count: "exact", head: true })
    .eq("feedback_id", feedbackId);

  if (error) {
    console.error("Failed to count feedback upvotes", error);
    return null;
  }

  const upvoteCount = count ?? 0;
  const { error: updateError } = await client
    .from("feedback_reports")
    .update({ upvote_count: upvoteCount })
    .eq("id", feedbackId);

  if (updateError) {
    console.error("Failed to update upvote count", updateError);
  }

  return upvoteCount;
}

async function handleUpvote(client: any, id: string, userId: string, action: "add" | "remove") {
  const { data: existing, error: existingError } = await client
    .from("feedback_upvotes")
    .select("feedback_id")
    .eq("feedback_id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) {
    console.error("Failed to check upvote status", existingError);
    return new Response(JSON.stringify({ message: "Unable to update upvote" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (action === "add" && !existing) {
    const { error } = await client
      .from("feedback_upvotes")
      .insert({ feedback_id: id, user_id: userId });

    if (error) {
      console.error("Failed to add upvote", error);
      return new Response(JSON.stringify({ message: "Unable to upvote feedback" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  if (action === "remove" && existing) {
    const { error } = await client
      .from("feedback_upvotes")
      .delete()
      .eq("feedback_id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to remove upvote", error);
      return new Response(JSON.stringify({ message: "Unable to remove upvote" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const upvoteCount = await updateUpvoteCount(client, id);

  return new Response(JSON.stringify({ upvote_count: upvoteCount ?? 0 }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleDelete(client: any, id: string, userId: string) {
  const { error } = await client
    .from("feedback_reports")
    .update({ status: "closed", deleted_at: new Date().toISOString(), reviewed_by: userId })
    .eq("id", id);

  if (error) {
    console.error("Failed to archive feedback", error);
    return new Response(JSON.stringify({ message: "Unable to archive feedback" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  // Extract JWT token from Authorization header
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");

  console.log("[manage-feedback] Auth header present:", !!authHeader);
  console.log("[manage-feedback] Auth header preview:", authHeader.substring(0, 20));

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

  console.log("[manage-feedback] User auth - Success:", !!user, "Error:", authError?.message);

    if (authError || !user) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

// Authorization handled per-route below (view: admin/super_admin; mutate: super_admin)

    const { url, routeSegments } = parseRoute(req);
    
    console.log("[manage-feedback] Method:", req.method, "RouteSegments:", JSON.stringify(routeSegments), "Full URL:", req.url);

    if (req.method === "GET" && (routeSegments.length === 0 || routeSegments[0] === "list")) {
      try {
        // Any authenticated user can list feedback (internal portal)
        await assertAuthenticated(serviceClient, user.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Forbidden";
        const status = message === "Insufficient privileges" ? 403 : 500;
        return new Response(JSON.stringify({ message }), {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return handleList(serviceClient, url);
    }

    if (routeSegments.length === 0) {
      return new Response(JSON.stringify({ message: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const id = routeSegments[0];

    if (req.method === "GET") {
      try {
        // Any authenticated user can view feedback details
        await assertAuthenticated(serviceClient, user.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Forbidden";
        const status = message === "Insufficient privileges" ? 403 : 500;
        return new Response(JSON.stringify({ message }), {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return handleDetail(serviceClient, id, user.id);
    }

    if (req.method === "POST" && routeSegments[1] === "comment") {
      try {
        // Any authenticated user can add comments (internal portal)
        await assertAuthenticated(serviceClient, user.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Forbidden";
        const status = message === "Insufficient privileges" ? 403 : 500;
        return new Response(JSON.stringify({ message }), {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const body = await req.json().catch(() => ({}));
      return handleComment(serviceClient, id, user.id, body);
    }

    if (req.method === "PUT" && routeSegments.length >= 2 && routeSegments[1] === "status") {
      try {
        // Any authenticated user can update status (internal portal)
        await assertAuthenticated(serviceClient, user.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Forbidden";
        const status = message === "Insufficient privileges" ? 403 : 500;
        return new Response(JSON.stringify({ message }), {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const body = await req.json().catch(() => ({}));
      return handleStatus(serviceClient, id, user.id, body);
    }

    if (req.method === "PUT" && routeSegments.length >= 2 && routeSegments[1] === "priority") {
      console.log("[manage-feedback] Matched priority route for id:", id);
      try {
        await assertAuthenticated(serviceClient, user.id);
      } catch (error) {
        console.log("[manage-feedback] Auth failed:", error);
        const message = error instanceof Error ? error.message : "Forbidden";
        const status = message === "Insufficient privileges" ? 403 : 500;
        return new Response(JSON.stringify({ message }), {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const body = await req.json().catch(() => ({}));
      return handlePriority(serviceClient, id, user.id, body);
    }

    if (req.method === "PUT" && routeSegments.length >= 2 && routeSegments[1] === "module") {
      try {
        await assertAuthenticated(serviceClient, user.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Forbidden";
        const status = message === "Insufficient privileges" ? 403 : 500;
        return new Response(JSON.stringify({ message }), {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const body = await req.json().catch(() => ({}));
      return handleModule(serviceClient, id, user.id, body);
    }

    if (routeSegments.length >= 2 && routeSegments[1] === "upvote") {
      try {
        await assertAuthenticated(serviceClient, user.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Forbidden";
        const status = message === "Insufficient privileges" ? 403 : 500;
        return new Response(JSON.stringify({ message }), {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (req.method === "POST") {
        return handleUpvote(serviceClient, id, user.id, "add");
      }

      if (req.method === "DELETE") {
        return handleUpvote(serviceClient, id, user.id, "remove");
      }
    }

    if (req.method === "DELETE" && routeSegments.length === 1) {
      try {
        await assertAtLeastAdmin(serviceClient, user.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Forbidden";
        const status = message === "Insufficient privileges" ? 403 : 500;
        return new Response(JSON.stringify({ message }), {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return handleDelete(serviceClient, id, user.id);
    }

    return new Response(JSON.stringify({ message: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error in manage-feedback", error);
    return new Response(JSON.stringify({ message: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

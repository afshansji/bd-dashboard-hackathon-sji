import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { corsHeaders } from "../_shared/cors.ts";

type EntityType = "comment" | "checklist" | "stage_change" | "deal_fields" | "all";

interface PushPayload {
  entity_type: EntityType;
  entity_ids?: string[];
  deal_id?: string; // For pushing specific deal field updates
}

interface PushError {
  id?: string;
  message: string;
}

interface PushResult {
  synced: number;
  failed: number;
  errors: PushError[];
}

interface PushResultsSummary {
  comments: PushResult;
  checklist: PushResult;
  stage_changes: PushResult;
  deal_fields?: PushResult;
}

interface IntegrationConfigRow {
  config?: {
    url?: string;
    anon_key?: string;
  } | null;
}

interface PendingCommentRow {
  id: string;
  comment: string;
  created_at: string;
  mentioned_user_emails: string[] | null;
  deal: {
    control_tower_id: string | null;
  } | null;
  author: {
    email: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface PendingChecklistRow {
  id: string;
  title: string;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  control_tower_item_id: string | null;
  deal: {
    control_tower_id: string | null;
  } | null;
}

function createEmptyResult(): PushResult {
  return { synced: 0, failed: 0, errors: [] };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError) {
      console.warn("[Push] Unable to resolve user from auth header:", authError.message);
    }

    const userId = user?.id ?? null;

    const body: PushPayload = await req.json();
    const entityType: EntityType = body.entity_type ?? "all";
    const entityIds = body.entity_ids;
    const dealId = body.deal_id; // For pushing specific deal field updates

    const { data: configRow, error: configError } = await supabase
      .from("integrations")
      .select("config")
      .eq("type", "control_tower")
      .eq("is_active", true)
      .maybeSingle();

    if (configError) {
      throw configError;
    }

    const configData = (configRow as IntegrationConfigRow | null)?.config ?? {};
    const controlTowerUrl =
      typeof configData.url === "string" ? configData.url : Deno.env.get("Controltowerurl");
    const controlTowerKey =
      typeof configData.anon_key === "string" ? configData.anon_key : Deno.env.get("CONTROLTOWERAPIKEY");

    if (!controlTowerUrl || !controlTowerKey) {
      console.error('[Push] Missing Control Tower config', {
        hasUrl: !!controlTowerUrl,
        hasKey: !!controlTowerKey,
        fromDB: !!(configData?.url && configData?.anon_key),
        fromEnv: !!(Deno.env.get("Controltowerurl") && Deno.env.get("CONTROLTOWERAPIKEY"))
      });
      throw new Error(
        "Control Tower credentials not accessible. " +
        "Ensure Controltowerurl and CONTROLTOWERAPIKEY secrets are set."
      );
    }
    
    console.log('[Push] Control Tower client initialized', {
      url: controlTowerUrl.substring(0, 30) + '...',
      source: configData?.url ? 'database' : 'environment'
    });

    const controlTowerClient = createClient(controlTowerUrl, controlTowerKey);

    const results: PushResultsSummary = {
      comments: createEmptyResult(),
      checklist: createEmptyResult(),
      stage_changes: createEmptyResult(),
      deal_fields: createEmptyResult(),
    };

    if (entityType === "comment" || entityType === "all") {
      let commentQuery = supabase
        .from("deal_comments")
        .select(`
          *,
          deal:deals!inner(control_tower_id),
          author:users!deal_comments_user_id_fkey(id, email, first_name, last_name)
        `)
        .eq("synced_to_control_tower", false)
        .order("created_at", { ascending: true });

      if (entityIds?.length) {
        commentQuery = commentQuery.in("id", entityIds);
      }

      const { data: pendingComments, error: commentsError } = await commentQuery.returns<PendingCommentRow[]>();
      if (commentsError) {
        throw commentsError;
      }

      for (const comment of pendingComments ?? []) {
        try {
          const controlTowerDealId = comment.deal?.control_tower_id;
          if (!controlTowerDealId) {
            throw new Error("Deal is missing Control Tower ID");
          }

          const author = comment.author;
          const authorName = author
            ? `${author.first_name ?? ""} ${author.last_name ?? ""}`.trim() || author.email
            : "Unknown";

          const { data: insertedComment, error: insertError } = await controlTowerClient
            .from("deal_comments")
            .insert({
              deal_id: controlTowerDealId,
              comment_text: comment.comment,
              user_email: author?.email ?? null,
              user_name: authorName,
              created_at: comment.created_at,
              mentioned_user_emails: comment.mentioned_user_emails ?? [],
            })
            .select()
            .maybeSingle();

          if (insertError) {
            throw insertError;
          }

          await supabase
            .from("deal_comments")
            .update({
              synced_to_control_tower: true,
              control_tower_comment_id: insertedComment?.id ?? null,
            })
            .eq("id", comment.id);

          await supabase.from("control_tower_sync_log").insert({
            sync_type: "push",
            entity_type: "comment",
            entity_id: comment.id,
            control_tower_id: insertedComment?.id ?? null,
            status: "success",
            payload: { deal_id: controlTowerDealId },
            synced_by: userId,
          });

          console.log(`[Push] Successfully synced comment ${comment.id} to Control Tower`);
          results.comments.synced += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to push comment";
          results.comments.failed += 1;
          results.comments.errors.push({ id: comment.id, message });

          await supabase.from("control_tower_sync_log").insert({
            sync_type: "push",
            entity_type: "comment",
            entity_id: comment.id,
            status: "failed",
            error_message: message,
            payload: { deal_id: comment.deal?.control_tower_id ?? null },
            synced_by: userId,
          });
        }
      }
    }

    if (entityType === "checklist" || entityType === "all") {
      let checklistQuery = supabase
        .from("deal_checklist_items")
        .select(`
          *,
          deal:deals!inner(control_tower_id)
        `)
        .eq("is_completed", true)
        .eq("synced_to_control_tower", false)
        .order("completed_at", { ascending: true });

      if (entityIds?.length) {
        checklistQuery = checklistQuery.in("id", entityIds);
      }

      const { data: completedItems, error: checklistError } = await checklistQuery.returns<PendingChecklistRow[]>();
      if (checklistError) {
        throw checklistError;
      }

      for (const item of completedItems ?? []) {
        try {
          const controlTowerDealId = item.deal?.control_tower_id;
          if (!controlTowerDealId) {
            throw new Error("Deal is missing Control Tower ID");
          }

          // If item has Control Tower ID, update the original item; otherwise insert update
          if (item.control_tower_item_id) {
            // Update the original checklist item in Control Tower
            // BD Portal completion always wins (conflict resolution rule)
            const { error: updateError } = await controlTowerClient
              .from("deal_checklist")
              .update({
                is_completed: item.is_completed,
                completed_at: item.completed_at,
                completed_by: item.completed_by, // BD Portal user wins
              })
              .eq("id", item.control_tower_item_id);

            if (updateError) {
              throw updateError;
            }

            console.log(`[Push] Updated Control Tower checklist item ${item.control_tower_item_id} (BD Portal completion wins)`);
          } else {
            // Item created in BD Portal - insert as update record
            const { error: insertError } = await controlTowerClient
              .from("deal_checklist_updates")
              .insert({
                deal_id: controlTowerDealId,
                item_title: item.title,
                is_completed: item.is_completed,
                completed_at: item.completed_at,
              });

            if (insertError) {
              throw insertError;
            }

            console.log(`[Push] Created checklist update in Control Tower for "${item.title}"`);
          }

          await supabase
            .from("deal_checklist_items")
            .update({ synced_to_control_tower: true })
            .eq("id", item.id);

          await supabase.from("control_tower_sync_log").insert({
            sync_type: "push",
            entity_type: "checklist",
            entity_id: item.id,
            control_tower_id: controlTowerDealId,
            status: "success",
            payload: { title: item.title },
            synced_by: userId,
          });

          results.checklist.synced += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to push checklist item";
          results.checklist.failed += 1;
          results.checklist.errors.push({ id: item.id, message });

          await supabase.from("control_tower_sync_log").insert({
            sync_type: "push",
            entity_type: "checklist",
            entity_id: item.id,
            status: "failed",
            error_message: message,
            payload: { deal_id: item.deal?.control_tower_id ?? null },
            synced_by: userId,
          });
        }
      }
    }

    // Push deal field updates to Control Tower
    if (entityType === "deal_fields" || entityType === "all") {
      let dealsQuery = supabase
        .from("deals")
        .select("*")
        .eq("synced_from_control_tower", true)
        .not("control_tower_id", "is", null);

      // If specific deal_id provided, only sync that deal
      if (dealId) {
        dealsQuery = dealsQuery.eq("id", dealId);
      } else if (entityType === "deal_fields") {
        // For explicit deal_fields requests, only sync modified deals
        // This is handled by checking updated_at > last_synced_at on Control Tower side
      }

      const { data: dealsToSync, error: dealsError } = await dealsQuery;
      if (dealsError) {
        console.error("[Push] Error fetching deals to sync:", dealsError);
        throw dealsError;
      }

      for (const deal of dealsToSync ?? []) {
        try {
          if (!deal.control_tower_id) {
            throw new Error("Deal is missing Control Tower ID");
          }

          // Only push if locally modified after last sync
          const updatedAt = deal.updated_at ? new Date(deal.updated_at) : null;
          const lastSyncedAt = deal.last_synced_at ? new Date(deal.last_synced_at) : null;
          
          if (lastSyncedAt && updatedAt && updatedAt <= lastSyncedAt) {
            // Skip - not modified since last sync
            continue;
          }

          // Map fields to Control Tower schema
          const updatePayload: any = {};
          
          // Core financial fields
          if (deal.amount !== null && deal.amount !== undefined) updatePayload.amount = deal.amount;
          if (deal.potential_amount !== null && deal.potential_amount !== undefined) updatePayload.potential_amount = deal.potential_amount;
          if (deal.probability !== null && deal.probability !== undefined) updatePayload.probability = deal.probability;
          
          // Date fields
          if (deal.expected_closing_date) updatePayload.expected_closing_date = deal.expected_closing_date;
          if (deal.close_date) updatePayload.closedate = deal.close_date;
          
          // Status and categorization
          if (deal.stage) updatePayload.dealstage = deal.stage;
          if (deal.priority) updatePayload.priority = deal.priority;
          if (deal.dealtype) updatePayload.dealtype = deal.dealtype;
          if (deal.lead_source) updatePayload.lead_source = deal.lead_source;
          if (deal.pipeline) updatePayload.pipeline = deal.pipeline;
          if (deal.type_of_work) updatePayload.type_of_work = deal.type_of_work;
          if (deal.category) updatePayload.category = deal.category;
          
          // Text fields
          if (deal.notes) updatePayload.notes = deal.notes;
          if (deal.tags) updatePayload.tags = deal.tags;
          
          // Update timestamp
          updatePayload.updated_at = new Date().toISOString();

          const { error: updateError } = await controlTowerClient
            .from("deals")
            .update(updatePayload)
            .eq("id", deal.control_tower_id);

          if (updateError) {
            throw updateError;
          }

          // Update last_synced_at in BD Portal
          await supabase
            .from("deals")
            .update({ last_synced_at: new Date().toISOString() })
            .eq("id", deal.id);

          await supabase.from("control_tower_sync_log").insert({
            sync_type: "push",
            entity_type: "deal_fields",
            entity_id: deal.id,
            control_tower_id: deal.control_tower_id,
            status: "success",
            payload: { fields_updated: Object.keys(updatePayload) },
            synced_by: userId,
          });

          console.log(`[Push] Successfully synced deal ${deal.id} (${Object.keys(updatePayload).length} fields) to Control Tower`);
          results.deal_fields!.synced += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to push deal fields";
          results.deal_fields!.failed += 1;
          results.deal_fields!.errors.push({ id: deal.id, message });

          await supabase.from("control_tower_sync_log").insert({
            sync_type: "push",
            entity_type: "deal_fields",
            entity_id: deal.id,
            status: "failed",
            error_message: message,
            payload: { deal_id: deal.control_tower_id },
            synced_by: userId,
          });
        }
      }
    }

    if (entityType === "stage_change" || entityType === "all") {
      // Placeholder for stage change synchronization (Phase 2)
      if (entityType === "stage_change") {
        console.log("[Push] Stage change sync is not yet implemented");
      }
    }

    console.log('[Push] Sync completed', {
      comments: `${results.comments.synced} synced, ${results.comments.failed} failed`,
      checklist: `${results.checklist.synced} synced, ${results.checklist.failed} failed`,
      deal_fields: `${results.deal_fields?.synced || 0} synced, ${results.deal_fields?.failed || 0} failed`
    });

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Push] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { corsHeaders } from "../_shared/cors.ts";

interface ApplyChecklistRequest {
  dealId: string;
  templateId?: string;
  stage?: string;
}

interface ChecklistTemplateItem {
  title: string;
  order_index: number;
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
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const payload: ApplyChecklistRequest = await req.json();
    if (!payload.dealId) {
      throw new Error("dealId is required");
    }

    let templateQuery = supabase
      .from("checklist_templates")
      .select("*")
      .eq("is_active", true)
      .order("updated_at", { ascending: false });

    if (payload.templateId) {
      templateQuery = templateQuery.eq("id", payload.templateId);
    } else if (payload.stage) {
      templateQuery = templateQuery.or(`stage.eq.${payload.stage},stage.is.null`);
    }

    const { data: templates, error: templateError } = await templateQuery;
    if (templateError) {
      throw templateError;
    }

    if (!templates || templates.length === 0) {
      return new Response(JSON.stringify({ error: "No template found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const template = templates[0];
    const items = Array.isArray(template.items) ? template.items as ChecklistTemplateItem[] : [];

    if (items.length === 0) {
      return new Response(JSON.stringify({ error: "Template has no items" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 3: Fetch existing checklist items to prevent duplicates
    const { data: existingItems } = await supabase
      .from("deal_checklist_items")
      .select("title")
      .eq("deal_id", payload.dealId);

    const existingTitles = new Set(
      (existingItems || []).map(item => item.title.toLowerCase().trim())
    );

    // Filter out items that already exist
    const itemsToInsert = items
      .filter(item => !existingTitles.has(item.title.toLowerCase().trim()))
      .map((item, index) => ({
        deal_id: payload.dealId,
        title: item.title,
        order_index: item.order_index ?? index,
        is_completed: false,
      }));

    // Only insert if we have new items
    if (itemsToInsert.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        items: [], 
        message: "All template items already exist" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Template] Inserting ${itemsToInsert.length} new items (${items.length - itemsToInsert.length} already exist)`);

    const { data: insertedItems, error: insertError } = await supabase
      .from("deal_checklist_items")
      .insert(itemsToInsert)
      .select();

    if (insertError) {
      throw insertError;
    }

    return new Response(JSON.stringify({ success: true, items: insertedItems }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

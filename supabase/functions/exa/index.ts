import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders } from "../_shared/cors.ts";

const headers = { ...corsHeaders, "Content-Type": "application/json" } as const;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[exa] Missing environment variables");
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    
    // Remove 'exa' from the path parts if present
    const functionIndex = pathParts.indexOf("exa");
    const relevantParts = functionIndex >= 0 ? pathParts.slice(functionIndex + 1) : pathParts;
    
    console.log(`[exa] Request: ${req.method} ${url.pathname}`);
    console.log(`[exa] Path parts:`, relevantParts);

    // Route: GET /exa/leads - List leads
    if (req.method === "GET" && relevantParts[0] === "leads" && !relevantParts[1]) {
      const page = parseInt(url.searchParams.get("page") || "1");
      const pageSize = parseInt(url.searchParams.get("pageSize") || "25");
      const search = url.searchParams.get("search") || "";
      const status = url.searchParams.get("status") || "";
      
      const offset = (page - 1) * pageSize;
      
      let query = supabase
        .from("leads")
        .select("*", { count: "exact" });
      
      if (search) {
        query = query.or(`contact_name.ilike.%${search}%,company_name.ilike.%${search}%,email.ilike.%${search}%`);
      }
      
      if (status) {
        query = query.eq("status", status);
      }
      
      const { data: leads, count, error } = await query
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);
      
      if (error) {
        console.error("[exa] Error fetching leads:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers }
        );
      }
      
      // Transform leads to match expected frontend format
      const transformedLeads = (leads || []).map((lead: any) => ({
        id: lead.id,
        slug: lead.slug,
        full_name: lead.contact_name,
        first_name: lead.contact_name?.split(" ")[0] || null,
        last_name: lead.contact_name?.split(" ").slice(1).join(" ") || null,
        company: lead.company_name,
        title: null,
        email: lead.email,
        phone: lead.phone,
        linkedin_url: lead.metadata?.linkedin_url || null,
        status: lead.status,
        source: lead.imported_via_exa ? "exa" : "manual",
        owner_id: lead.created_by,
        owner_name: null,
        enrichment_status: lead.enrichment_status,
        last_enriched_at: lead.last_enriched_at,
        created_at: lead.created_at,
        updated_at: lead.updated_at,
        metadata: lead.metadata,
      }));
      
      return new Response(
        JSON.stringify({
          leads: transformedLeads,
          total: count || 0,
          page,
          pageSize,
        }),
        { status: 200, headers }
      );
    }
    
    // Route: GET /exa/leads/:id - Get single lead
    if (req.method === "GET" && relevantParts[0] === "leads" && relevantParts[1]) {
      const leadId = relevantParts[1];
      
      // Try to find by ID or slug
      let query = supabase.from("leads").select("*");
      
      // Check if it's a UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(leadId)) {
        query = query.eq("id", leadId);
      } else {
        query = query.eq("slug", leadId);
      }
      
      const { data: lead, error } = await query.single();
      
      if (error || !lead) {
        console.error("[exa] Lead not found:", error);
        return new Response(
          JSON.stringify({ error: "Lead not found" }),
          { status: 404, headers }
        );
      }
      
      // Transform to expected format
      const transformedLead = {
        id: lead.id,
        slug: lead.slug,
        full_name: lead.contact_name,
        first_name: lead.contact_name?.split(" ")[0] || null,
        last_name: lead.contact_name?.split(" ").slice(1).join(" ") || null,
        company: lead.company_name,
        title: null,
        email: lead.email,
        phone: lead.phone,
        linkedin_url: lead.metadata?.linkedin_url || null,
        status: lead.status,
        source: lead.imported_via_exa ? "exa" : "manual",
        owner_id: lead.created_by,
        owner_name: null,
        enrichment_status: lead.enrichment_status,
        last_enriched_at: lead.last_enriched_at,
        created_at: lead.created_at,
        updated_at: lead.updated_at,
        metadata: lead.metadata,
      };
      
      return new Response(
        JSON.stringify({ lead: transformedLead }),
        { status: 200, headers }
      );
    }
    
    // Route not found
    console.log(`[exa] Route not found: ${req.method} ${url.pathname}`);
    return new Response(
      JSON.stringify({ error: "Route not found" }),
      { status: 404, headers }
    );
    
  } catch (error) {
    console.error("[exa] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers }
    );
  }
});

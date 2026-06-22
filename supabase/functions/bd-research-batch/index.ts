import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CampaignStats {
  id: string;
  name: string;
  status: string;
  total_contacts: number;
  analyzed_contacts: number;
  pending_contacts: number;
  avg_quality_score: number | null;
}

interface ContactForAnalysis {
  id: string;
  contact_name: string;
  contact_company: string | null;
  contact_title: string | null;
  contact_email: string | null;
  contact_linkedin_url: string | null;
  linkedin_headline: string | null;
  linkedin_about: string | null;
  company_industry: string | null;
  company_size: string | null;
  lead_quality_score: number | null;
  research_summary: Record<string, unknown> | null;
  campaign_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { mode, campaign_ids, batch_size, contact_ids } = await req.json();

    // Mode: analyze - Get campaign stats with pending analysis counts
    if (mode === "analyze") {
      const { data: campaigns, error: campError } = await supabase
        .from("bd_campaigns")
        .select("id, name, status")
        .in("status", ["active", "planning", "paused"]);

      if (campError) throw campError;

      const campaignStats: CampaignStats[] = [];

      for (const campaign of campaigns || []) {
        // Get total contacts
        const { count: totalCount } = await supabase
          .from("campaign_contacts")
          .select("*", { count: "exact", head: true })
          .eq("campaign_id", campaign.id);

        // Get contacts that have been analyzed (have ai_agent_runs with bd-research-analyst)
        const { data: analyzedRuns } = await supabase
          .from("ai_agent_runs")
          .select("execution_context")
          .eq("status", "completed")
          .not("execution_context", "is", null);

        // Count analyzed contacts for this campaign
        const analyzedContactIds = new Set<string>();
        for (const run of analyzedRuns || []) {
          const ctx = run.execution_context as Record<string, unknown>;
          if (ctx?.contact_id && ctx?.campaign_id === campaign.id) {
            analyzedContactIds.add(ctx.contact_id as string);
          }
        }

        const analyzedCount = analyzedContactIds.size;
        const pendingCount = (totalCount || 0) - analyzedCount;

        // Get average quality score
        const { data: scores } = await supabase
          .from("campaign_contacts")
          .select("lead_quality_score")
          .eq("campaign_id", campaign.id)
          .not("lead_quality_score", "is", null);

        let avgScore: number | null = null;
        if (scores && scores.length > 0) {
          const validScores = scores.filter(s => s.lead_quality_score !== null);
          if (validScores.length > 0) {
            avgScore = Math.round(
              validScores.reduce((sum, s) => sum + (s.lead_quality_score || 0), 0) / validScores.length
            );
          }
        }

        campaignStats.push({
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          total_contacts: totalCount || 0,
          analyzed_contacts: analyzedCount,
          pending_contacts: pendingCount,
          avg_quality_score: avgScore,
        });
      }

      const totalPending = campaignStats.reduce((sum, c) => sum + c.pending_contacts, 0);

      return new Response(
        JSON.stringify({
          success: true,
          campaigns: campaignStats,
          total_campaigns: campaignStats.length,
          total_pending: totalPending,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mode: preview - Get contacts that need analysis
    if (mode === "preview") {
      if (!campaign_ids || !Array.isArray(campaign_ids)) {
        throw new Error("campaign_ids required for preview mode");
      }

      const limit = batch_size || 25;

      // Get all contacts from selected campaigns
      const { data: allContacts, error: contactError } = await supabase
        .from("campaign_contacts")
        .select("id, contact_name, contact_company, contact_title, contact_email, contact_linkedin_url, lead_quality_score, campaign_id")
        .in("campaign_id", campaign_ids)
        .order("created_at", { ascending: false });

      if (contactError) throw contactError;

      // Get already analyzed contact IDs
      const { data: runs } = await supabase
        .from("ai_agent_runs")
        .select("execution_context")
        .eq("status", "completed");

      const analyzedIds = new Set<string>();
      for (const run of runs || []) {
        const ctx = run.execution_context as Record<string, unknown>;
        if (ctx?.contact_id) {
          analyzedIds.add(ctx.contact_id as string);
        }
      }

      // Filter to pending contacts
      const pendingContacts = (allContacts || []).filter(c => !analyzedIds.has(c.id));
      const previewContacts = pendingContacts.slice(0, limit);

      return new Response(
        JSON.stringify({
          success: true,
          contacts: previewContacts,
          total_pending: pendingContacts.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mode: execute - Run analysis on specified contacts
    if (mode === "execute") {
      if (!contact_ids || !Array.isArray(contact_ids)) {
        throw new Error("contact_ids required for execute mode");
      }

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY not configured");
      }

      // Get contact details
      const { data: contacts, error: fetchError } = await supabase
        .from("campaign_contacts")
        .select(`
          id, contact_name, contact_company, contact_title, contact_email, contact_linkedin_url,
          linkedin_headline, linkedin_about, company_industry, company_size, lead_quality_score,
          research_summary, campaign_id
        `)
        .in("id", contact_ids);

      if (fetchError) throw fetchError;

      // Get BD Research Analyst agent
      const { data: agent } = await supabase
        .from("ai_agents")
        .select("id, name, system_prompt, prompt_template")
        .eq("slug", "bd-research-analyst")
        .single();

      const agentId = agent?.id;

      const results: Array<{
        contact_id: string;
        contact_name: string;
        success: boolean;
        quality_score?: number;
        engagement_readiness?: string;
        key_findings?: string[];
        error?: string;
      }> = [];

      for (const contact of contacts || []) {
        try {
          // Build context for AI analysis
          const contactContext = `
Contact: ${contact.contact_name}
Title: ${contact.contact_title || "Unknown"}
Company: ${contact.contact_company || "Unknown"}
Industry: ${contact.company_industry || "Unknown"}
Company Size: ${contact.company_size || "Unknown"}
Email: ${contact.contact_email || "Not available"}
LinkedIn: ${contact.contact_linkedin_url || "Not available"}
LinkedIn Headline: ${contact.linkedin_headline || "Not available"}
LinkedIn About: ${contact.linkedin_about || "Not available"}
Current Quality Score: ${contact.lead_quality_score || "Not scored"}
Research Summary: ${contact.research_summary ? JSON.stringify(contact.research_summary) : "No prior research"}
`;

          const systemPrompt = agent?.system_prompt || `You are a BD Research Analyst AI. Analyze contacts and provide actionable insights for business development outreach.`;

          const analysisPrompt = `
Analyze this contact for BD outreach potential:

${contactContext}

Provide a comprehensive analysis with:
1. Lead Quality Score (0-100) - based on title seniority, company fit, engagement signals
2. Engagement Readiness (Hot/Warm/Cold) - likelihood to respond positively
3. Key Findings - 3-5 bullet points about this contact
4. Recommended Approach - best way to reach out
5. Talking Points - 3 personalized conversation starters
6. Risk Factors - potential objections or challenges

Return as JSON:
{
  "quality_score": number,
  "engagement_readiness": "hot" | "warm" | "cold",
  "key_findings": ["string"],
  "recommendations": ["string"],
  "talking_points": ["string"],
  "risk_factors": ["string"],
  "analysis_summary": "string"
}`;

          // Call Lovable AI Gateway
          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: analysisPrompt },
              ],
              temperature: 0.3,
            }),
          });

          if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            console.error(`AI error for ${contact.contact_name}:`, errorText);
            throw new Error(`AI analysis failed: ${aiResponse.status}`);
          }

          const aiData = await aiResponse.json();
          const aiContent = aiData.choices?.[0]?.message?.content || "";

          // Parse AI response
          let analysis: Record<string, unknown> = {};
          try {
            const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              analysis = JSON.parse(jsonMatch[0]);
            }
          } catch {
            console.error("Failed to parse AI response:", aiContent);
            analysis = {
              quality_score: contact.lead_quality_score || 50,
              engagement_readiness: "warm",
              key_findings: ["Analysis completed with limited data"],
              analysis_summary: aiContent.substring(0, 500),
            };
          }

          // Store run in ai_agent_runs
          await supabase.from("ai_agent_runs").insert({
            agent_id: agentId,
            status: "completed",
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            input: { contact_id: contact.id, contact_name: contact.contact_name },
            output: analysis,
            execution_context: {
              contact_id: contact.id,
              campaign_id: contact.campaign_id,
              mode: "batch_analysis",
            },
            structured_output: analysis,
          });

          // Update contact with new quality score if provided
          if (analysis.quality_score) {
            await supabase
              .from("campaign_contacts")
              .update({
                lead_quality_score: analysis.quality_score as number,
                research_summary: {
                  ...((contact.research_summary as Record<string, unknown>) || {}),
                  bd_analysis: analysis,
                  analyzed_at: new Date().toISOString(),
                },
              })
              .eq("id", contact.id);
          }

          results.push({
            contact_id: contact.id,
            contact_name: contact.contact_name,
            success: true,
            quality_score: analysis.quality_score as number,
            engagement_readiness: analysis.engagement_readiness as string,
            key_findings: analysis.key_findings as string[],
          });
        } catch (error) {
          console.error(`Error analyzing ${contact.contact_name}:`, error);
          results.push({
            contact_id: contact.id,
            contact_name: contact.contact_name,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      // Calculate summary
      const successful = results.filter(r => r.success);
      const qualityScores = successful.map(r => r.quality_score).filter(s => s !== undefined) as number[];
      const avgScore = qualityScores.length > 0 
        ? Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length)
        : null;

      const engagementCounts = { hot: 0, warm: 0, cold: 0 };
      for (const r of successful) {
        const eng = r.engagement_readiness?.toLowerCase() || "cold";
        if (eng === "hot") engagementCounts.hot++;
        else if (eng === "warm") engagementCounts.warm++;
        else engagementCounts.cold++;
      }

      const qualityDistribution = { high: 0, medium: 0, low: 0 };
      for (const score of qualityScores) {
        if (score >= 70) qualityDistribution.high++;
        else if (score >= 40) qualityDistribution.medium++;
        else qualityDistribution.low++;
      }

      return new Response(
        JSON.stringify({
          success: true,
          results,
          summary: {
            total: results.length,
            successful: successful.length,
            failed: results.length - successful.length,
            avg_score: avgScore,
            engagement_distribution: engagementCounts,
            quality_distribution: qualityDistribution,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown mode: ${mode}`);
  } catch (error) {
    console.error("BD Research Batch error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

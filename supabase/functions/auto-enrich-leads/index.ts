import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EnrichmentRequest {
  mode: "analyze" | "preview" | "execute";
  campaign_ids?: string[];
  batch_size?: number;
  contact_ids?: string[];
}

interface CampaignStats {
  id: string;
  name: string;
  status: string;
  total_contacts: number;
  enriched_contacts: number;
  pending_contacts: number;
  avg_quality_score: number | null;
}

interface ContactPreview {
  id: string;
  contact_name: string;
  contact_company: string | null;
  contact_title: string | null;
  contact_email: string | null;
  contact_linkedin_url: string | null;
  last_enriched_at: string | null;
}

interface EnrichmentResult {
  contact_id: string;
  contact_name: string;
  success: boolean;
  quality_score?: number;
  enriched_fields?: string[];
  error?: string;
}

// Helper function for fallback scoring when AI is unavailable
function calculateFallbackScore(contact: { contact_linkedin_url: string | null; contact_company: string | null; contact_title: string | null }): number {
  let score = 30;
  if (contact.contact_linkedin_url) score += 20;
  if (contact.contact_company) score += 15;
  if (contact.contact_title) {
    const title = contact.contact_title.toLowerCase();
    if (title.includes('ceo') || title.includes('founder') || title.includes('president') || title.includes('chief')) {
      score += 25;
    } else if (title.includes('vp') || title.includes('vice president') || title.includes('director')) {
      score += 20;
    } else if (title.includes('manager') || title.includes('head')) {
      score += 15;
    } else {
      score += 10;
    }
  }
  return Math.min(100, score);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { mode, campaign_ids, batch_size = 25, contact_ids }: EnrichmentRequest = await req.json();

    console.log(`[auto-enrich-leads] Mode: ${mode}, Campaigns: ${campaign_ids?.length || 0}, Batch: ${batch_size}`);

    // MODE: ANALYZE - Get campaign statistics
    if (mode === "analyze") {
      const { data: campaigns, error: campaignsError } = await supabase
        .from("bd_campaigns")
        .select("id, name, status")
        .in("status", ["planning", "active", "paused"])
        .order("created_at", { ascending: false });

      if (campaignsError) throw campaignsError;

      const stats: CampaignStats[] = [];

      for (const campaign of campaigns || []) {
        // Get total contacts
        const { count: totalCount } = await supabase
          .from("campaign_contacts")
          .select("*", { count: "exact", head: true })
          .eq("campaign_id", campaign.id);

        // Get enriched contacts - must have BOTH last_enriched_at AND lead_quality_score
        // This ensures newly added contacts (that may have last_enriched_at set by import) are still marked as pending
        const { count: enrichedCount } = await supabase
          .from("campaign_contacts")
          .select("*", { count: "exact", head: true })
          .eq("campaign_id", campaign.id)
          .not("last_enriched_at", "is", null)
          .not("lead_quality_score", "is", null);

        // Get average quality score
        const { data: scoreData } = await supabase
          .from("campaign_contacts")
          .select("lead_quality_score")
          .eq("campaign_id", campaign.id)
          .not("lead_quality_score", "is", null);

        const avgScore = scoreData && scoreData.length > 0
          ? Math.round(scoreData.reduce((sum, c) => sum + (c.lead_quality_score || 0), 0) / scoreData.length)
          : null;

        stats.push({
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          total_contacts: totalCount || 0,
          enriched_contacts: enrichedCount || 0,
          pending_contacts: (totalCount || 0) - (enrichedCount || 0),
          avg_quality_score: avgScore,
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        campaigns: stats,
        total_campaigns: stats.length,
        total_pending: stats.reduce((sum, c) => sum + c.pending_contacts, 0)
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MODE: PREVIEW - Get contacts that need enrichment
    // A contact needs enrichment if lead_quality_score is NULL (regardless of last_enriched_at)
    if (mode === "preview") {
      if (!campaign_ids || campaign_ids.length === 0) {
        throw new Error("No campaigns selected for preview");
      }

      const { data: contacts, error: contactsError } = await supabase
        .from("campaign_contacts")
        .select("id, contact_name, contact_company, contact_title, contact_email, contact_linkedin_url, last_enriched_at")
        .in("campaign_id", campaign_ids)
        .is("lead_quality_score", null)
        .limit(batch_size)
        .order("created_at", { ascending: true });

      if (contactsError) throw contactsError;

      // Get total count of contacts needing enrichment
      const { count: totalPending } = await supabase
        .from("campaign_contacts")
        .select("*", { count: "exact", head: true })
        .in("campaign_id", campaign_ids)
        .is("lead_quality_score", null);

      return new Response(JSON.stringify({
        success: true,
        contacts: contacts as ContactPreview[],
        total_pending: totalPending || 0,
        batch_size,
        estimated_time_seconds: (contacts?.length || 0) * 3 // ~3 seconds per contact
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MODE: EXECUTE - Run enrichment
    if (mode === "execute") {
      const targetContactIds = contact_ids || [];
      
      // If no specific contacts, get unenriched ones from selected campaigns
      // A contact needs enrichment if lead_quality_score is NULL
      let contactsToEnrich: { id: string; contact_name: string; contact_company: string | null; contact_linkedin_url: string | null; contact_title: string | null }[] = [];
      
      if (targetContactIds.length > 0) {
        const { data } = await supabase
          .from("campaign_contacts")
          .select("id, contact_name, contact_company, contact_linkedin_url, contact_title")
          .in("id", targetContactIds);
        contactsToEnrich = data || [];
      } else if (campaign_ids && campaign_ids.length > 0) {
        const { data } = await supabase
          .from("campaign_contacts")
          .select("id, contact_name, contact_company, contact_linkedin_url, contact_title")
          .in("campaign_id", campaign_ids)
          .is("lead_quality_score", null)
          .limit(batch_size);
        contactsToEnrich = data || [];
      }

      if (contactsToEnrich.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          message: "No contacts to enrich",
          results: [],
          summary: { total: 0, successful: 0, failed: 0 }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results: EnrichmentResult[] = [];
      const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
      const perplexityApiKey = Deno.env.get("PERPLEXITY_API_KEY");

      for (const contact of contactsToEnrich) {
        try {
          console.log(`[auto-enrich-leads] Enriching contact: ${contact.contact_name}`);
          
          let enrichedData: Record<string, unknown> = {};
          let researchSummary: string | null = null;

          // Use Perplexity if available for comprehensive research
          if (perplexityApiKey) {
            try {
              const researchQuery = `Research this professional and their company comprehensively:

Person: ${contact.contact_name}
Title: ${contact.contact_title || "Unknown"}
Company: ${contact.contact_company || "Unknown"}
LinkedIn: ${contact.contact_linkedin_url || "Not provided"}

Please find and provide:
1. PERSON INFO:
   - Current job title and role description
   - Professional headline or tagline
   - Career summary/about section
   - Location (city, state/country)
   - Key skills and expertise areas (list top 5-10)
   - Previous employers (list up to 5 recent ones)
   - Education background (degrees, institutions)
   - Estimated total years of professional experience
   - Industry focus/specialization

2. COMPANY INFO:
   - Official website URL
   - Industry/sector
   - Company size (employee count range)
   - Headquarters location
   - Company description (1-2 sentences)
   - Year founded if available

Provide detailed, accurate information based on publicly available sources.`;
              
              const perplexityResponse = await fetch("https://api.perplexity.ai/chat/completions", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${perplexityApiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "sonar",
                  messages: [{ role: "user", content: researchQuery }],
                  max_tokens: 1000,
                }),
              });

              if (perplexityResponse.ok) {
                const perplexityData = await perplexityResponse.json();
                researchSummary = perplexityData.choices?.[0]?.message?.content || null;
                console.log(`[auto-enrich-leads] Perplexity research completed for ${contact.contact_name}`);
              }
            } catch (e) {
              console.error(`[auto-enrich-leads] Perplexity error for ${contact.contact_name}:`, e);
            }
          }

          // Use Lovable AI to analyze, score, and extract structured LinkedIn data
          if (lovableApiKey) {
            const scorePrompt = `Analyze this business contact and extract comprehensive profile data. Return structured JSON.

Contact Info:
- Name: ${contact.contact_name}
- Company: ${contact.contact_company || "Unknown"}
- Title: ${contact.contact_title || "Unknown"}
- LinkedIn URL: ${contact.contact_linkedin_url || "Not provided"}

${researchSummary ? `Research Data:\n${researchSummary}` : "No research data available - estimate based on title and company."}

Based on ALL available information, provide a complete assessment.

SCORING CRITERIA (0-100):
- Profile completeness: +20 if has LinkedIn, +15 if has company, +10 if has title
- Role seniority: C-level/Founder=+25, VP/Director=+20, Manager=+15, Individual=+10
- Company data quality: +15 if known industry/size/website
- Engagement potential: +10 if recent activity or news mentioned

Respond ONLY with this JSON structure (no markdown, no explanation):
{
  "quality_score": <number 0-100>,
  "reasoning": "<brief 1-2 sentence explanation of score>",
  "linkedin_headline": "<professional headline/tagline or null>",
  "linkedin_about": "<career summary, max 200 chars or null>",
  "linkedin_location": "<city, state/country or null>",
  "linkedin_skills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "current_employer": "<current company name or null>",
  "current_position_title": "<current job title or null>",
  "previous_employers": ["company1", "company2", "company3"],
  "education_summary": "<degrees and institutions, brief or null>",
  "total_years_experience": <number or null>,
  "industry_focus": "<primary industry/sector or null>",
  "company_industry": "<company's industry or null>",
  "company_size": "<employee range like '50-200' or '1000+' or null>",
  "company_website": "<company website URL or null>",
  "company_headquarters": "<city, country or null>",
  "company_description": "<1-2 sentence company description or null>"
}`;

            try {
              const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${lovableApiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "google/gemini-2.5-flash",
                  messages: [
                    { role: "system", content: "You are a professional data extraction assistant. Always respond with valid JSON only, no markdown formatting." },
                    { role: "user", content: scorePrompt }
                  ],
                  temperature: 0.2,
                }),
              });

              if (aiResponse.ok) {
                const aiData = await aiResponse.json();
                const content = aiData.choices?.[0]?.message?.content || "";
                
                // Extract JSON from response (handle potential markdown wrapping)
                let jsonStr = content;
                const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  jsonStr = jsonMatch[1] || jsonMatch[0];
                }
                
                try {
                  const parsed = JSON.parse(jsonStr.trim());
                  
                  // Build enriched data with all LinkedIn fields
                  enrichedData = {
                    // Quality score
                    lead_quality_score: Math.min(100, Math.max(0, parsed.quality_score || 50)),
                    
                    // LinkedIn profile data
                    linkedin_headline: parsed.linkedin_headline || null,
                    linkedin_about: parsed.linkedin_about || null,
                    linkedin_location: parsed.linkedin_location || null,
                    linkedin_skills: Array.isArray(parsed.linkedin_skills) && parsed.linkedin_skills.length > 0 
                      ? parsed.linkedin_skills.slice(0, 10) 
                      : null,
                    
                    // Career data
                    current_employer: parsed.current_employer || contact.contact_company || null,
                    current_position_title: parsed.current_position_title || contact.contact_title || null,
                    previous_employers: Array.isArray(parsed.previous_employers) && parsed.previous_employers.length > 0 
                      ? parsed.previous_employers.slice(0, 5) 
                      : null,
                    education_summary: parsed.education_summary || null,
                    total_years_experience: typeof parsed.total_years_experience === 'number' 
                      ? parsed.total_years_experience 
                      : null,
                    industry_focus: parsed.industry_focus || null,
                    
                    // Company data
                    company_industry: parsed.company_industry || null,
                    company_size: parsed.company_size || null,
                    company_website: parsed.company_website || null,
                    company_headquarters: parsed.company_headquarters || null,
                    company_description: parsed.company_description || null,
                  };
                  
                  console.log(`[auto-enrich-leads] AI enrichment successful for ${contact.contact_name}: score=${enrichedData.lead_quality_score}`);
                } catch (parseError) {
                  console.error(`[auto-enrich-leads] JSON parse error for ${contact.contact_name}:`, parseError);
                  // Fallback scoring
                  enrichedData.lead_quality_score = calculateFallbackScore(contact);
                }
              } else {
                console.error(`[auto-enrich-leads] AI response not OK for ${contact.contact_name}: ${aiResponse.status}`);
                enrichedData.lead_quality_score = calculateFallbackScore(contact);
              }
            } catch (e) {
              console.error(`[auto-enrich-leads] AI scoring error for ${contact.contact_name}:`, e);
              enrichedData.lead_quality_score = calculateFallbackScore(contact);
            }
          } else {
            // Fallback scoring without AI
            enrichedData.lead_quality_score = calculateFallbackScore(contact);
          }

          // Add research summary if available
          if (researchSummary) {
            enrichedData.research_summary = { 
              content: researchSummary, 
              enriched_at: new Date().toISOString(),
              source: "auto-enrichment",
              fields_extracted: Object.keys(enrichedData).filter(k => enrichedData[k] !== null).length
            };
          }

          // Update the contact
          const enrichedFields = Object.keys(enrichedData).filter(k => enrichedData[k] !== null);
          
          const { error: updateError } = await supabase
            .from("campaign_contacts")
            .update({
              ...enrichedData,
              last_enriched_at: new Date().toISOString(),
            })
            .eq("id", contact.id);

          if (updateError) throw updateError;

          results.push({
            contact_id: contact.id,
            contact_name: contact.contact_name,
            success: true,
            quality_score: enrichedData.lead_quality_score as number,
            enriched_fields: enrichedFields,
          });

        } catch (e) {
          console.error(`[auto-enrich-leads] Error enriching ${contact.contact_name}:`, e);
          results.push({
            contact_id: contact.id,
            contact_name: contact.contact_name,
            success: false,
            error: e instanceof Error ? e.message : "Unknown error",
          });
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      // Calculate score distribution
      const scores = successful.map(r => r.quality_score || 0);
      const highQuality = scores.filter(s => s >= 70).length;
      const mediumQuality = scores.filter(s => s >= 40 && s < 70).length;
      const lowQuality = scores.filter(s => s < 40).length;

      return new Response(JSON.stringify({
        success: true,
        results,
        summary: {
          total: results.length,
          successful: successful.length,
          failed: failed.length,
          score_distribution: {
            high: highQuality,
            medium: mediumQuality,
            low: lowQuality,
          },
          avg_score: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown mode: ${mode}`);

  } catch (error) {
    console.error("[auto-enrich-leads] Error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

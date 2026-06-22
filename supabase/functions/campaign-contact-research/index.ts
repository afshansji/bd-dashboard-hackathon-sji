import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders } from "../_shared/cors.ts";
import { getValidUrl } from "../_shared/urlUtils.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const perplexityApiKey = Deno.env.get("PERPLEXITY_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase environment variables not configured");
    }

    if (!perplexityApiKey) {
      throw new Error("PERPLEXITY_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { contactId } = await req.json();
    if (!contactId) {
      return new Response(JSON.stringify({ error: "contactId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch contact details
    const { data: contact, error: contactError } = await supabase
      .from("campaign_contacts")
      .select("*, bd_campaigns!inner(name, campaign_type, target_regions)")
      .eq("id", contactId)
      .maybeSingle();

    if (contactError || !contact) {
      return new Response(JSON.stringify({ error: "Contact not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Perplexity's current default model
    const model = "sonar";

    // Build research query with both contact and company research
    const query = `Research ${contact.contact_name}${contact.contact_company ? ` at ${contact.contact_company}` : ""}${contact.contact_title ? `, ${contact.contact_title}` : ""}. 
    
Campaign context: ${contact.bd_campaigns.name} (${contact.bd_campaigns.campaign_type})
${contact.contact_linkedin_url ? `LinkedIn: ${contact.contact_linkedin_url}` : ""}

Provide in structured sections:

CONTACT INFORMATION:
1. Professional background and expertise
2. Recent activities or achievements
3. Potential pain points or needs relevant to our campaign
4. Personalization opportunities for outreach
5. Best approach for engagement

COMPANY INFORMATION${contact.contact_company ? ` (for ${contact.contact_company})` : ''}:
1. Company website URL
2. Company LinkedIn URL
3. Industry/sector
4. Company size (employee count range)
5. Headquarters location
6. Brief company description (2-3 sentences)
7. Year founded (if available)
8. Technologies used (if known)

Format your response clearly with "CONTACT:" and "COMPANY:" section headers.`;

    console.log("Calling Perplexity API with model:", model);

    // Call Perplexity API
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${perplexityApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "You are a business development research assistant. Provide concise, actionable insights for B2B outreach.",
          },
          {
            role: "user",
            content: query,
          },
        ],
        temperature: 0.2,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Perplexity API error:", response.status, errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const fullResearchResponse = aiResponse.choices?.[0]?.message?.content || "No research generated";

    // Split contact and company sections
    const contactSection = fullResearchResponse.split('COMPANY:')[0].replace('CONTACT:', '').trim();
    const companySection = fullResearchResponse.split('COMPANY:')[1]?.trim() || '';

    // Extract company data using multiple regex patterns for better matching
    // Website extraction - try multiple patterns
    const websitePatterns = [
      /(?:website|site|web|url|domain)[:\s]+([^\s\n]+)/i,
      /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/,
      /\b([a-zA-Z0-9-]+\.(?:com|org|net|io|ai|co|dev|app|tech|edu|gov))\b/i,
    ];
    
    let websiteUrl = null;
    for (const pattern of websitePatterns) {
      const match = companySection.match(pattern);
      if (match && match[1]) {
        websiteUrl = match[1].trim();
        // Clean up common artifacts
        websiteUrl = websiteUrl.replace(/[,;.)\]]+$/, '').trim();
        if (websiteUrl.length > 4 && !websiteUrl.includes('linkedin.com')) {
          break;
        }
      }
    }

    // LinkedIn extraction - try multiple patterns
    const linkedinPatterns = [
      /(?:linkedin|LinkedIn)[:\s]+([^\s\n]+(?:linkedin\.com[^\s\n]*))/i,
      /(https?:\/\/(?:www\.)?linkedin\.com\/company\/[^\s\n]+)/i,
    ];
    
    let linkedinUrl = null;
    for (const pattern of linkedinPatterns) {
      const match = companySection.match(pattern);
      if (match && match[1]) {
        linkedinUrl = match[1].trim().replace(/[,;.)\]]+$/, '').trim();
        break;
      }
    }

    const industryMatch = companySection.match(/(?:industry|sector)[:\s]+([^\n]+)/i);
    const sizeMatch = companySection.match(/(?:size|employee|employees|count)[:\s]+([^\n]+)/i);
    const hqMatch = companySection.match(/(?:headquarters|hq|location)[:\s]+([^\n]+)/i);
    const descMatch = companySection.match(/(?:description|about)[:\s]+([^\n]+(?:\n[^\n]+)?(?:\n[^\n]+)?)/i);

    const companyData = {
      website: websiteUrl,
      linkedin_url: linkedinUrl,
      industry: industryMatch?.[1]?.trim(),
      employee_count: sizeMatch?.[1]?.trim(),
      headquarters: hqMatch?.[1]?.trim(),
      description: descMatch?.[1]?.trim(),
    };

    console.log("Extracted company data:", JSON.stringify(companyData, null, 2));

    // Fallback: If website not found but we have a company name, do a targeted search
    if (!companyData.website && contact.contact_company) {
      console.log("Website not found, attempting fallback search for:", contact.contact_company);
      
      try {
        const fallbackResponse = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${perplexityApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sonar",
            messages: [
              {
                role: "system",
                content: "You are a company information extractor. Provide only the official website URL.",
              },
              {
                role: "user",
                content: `What is the official website URL for the company "${contact.contact_company}"? Respond with only the URL, nothing else.`,
              },
            ],
            temperature: 0.1,
            max_tokens: 100,
          }),
        });

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          const websiteText = fallbackData.choices?.[0]?.message?.content?.trim();
          
          // Extract URL from response
          const urlMatch = websiteText?.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/);
          if (urlMatch && urlMatch[0]) {
            companyData.website = urlMatch[0].replace(/[,;.)\]]+$/, '').trim();
            console.log("Fallback search found website:", companyData.website);
          }
        }
      } catch (fallbackError) {
        console.error("Fallback website search failed:", fallbackError);
        // Continue without website - don't fail the entire research
      }
    }

    // Parse LinkedIn data from metadata if available
    const { data: contactData } = await supabase
      .from("campaign_contacts")
      .select("metadata")
      .eq("id", contactId)
      .single();

    let linkedInFields = {};
    if (contactData?.metadata) {
      const text = typeof contactData.metadata === 'string' 
        ? contactData.metadata 
        : (contactData.metadata as any).text || JSON.stringify(contactData.metadata);
      
      const headlineMatch = text.match(/###\s*([^\n]+?)\s*at\s+\[/);
      const employerMatch = text.match(/at\s+\[([^\]]+)\]/);
      
      linkedInFields = {
        linkedin_headline: headlineMatch?.[1]?.trim(),
        current_employer: employerMatch?.[1]?.trim(),
        current_position_title: headlineMatch?.[1]?.trim(),
      };
    }

    // Validate and normalize website URL (adds https:// if missing)
    companyData.website = getValidUrl(companyData.website);
    if (companyData.website) {
      console.log("Normalized website URL:", companyData.website);
    } else {
      console.log("Invalid or missing website URL, setting to null");
    }

    // Company data will be stored directly in campaign_contacts fields
    console.log("Company data ready for contact update");

    // Update contact with research summary, company link, and parsed fields
    // Only include valid website URL (or null)
    const updateData: any = {
      research_summary: {
        summary: contactSection,
        generated_at: new Date().toISOString(),
        generated_by: user.id,
        model: model,
        query: query,
      },
      last_enriched_at: new Date().toISOString(),
      company_linkedin_url: companyData.linkedin_url,
      company_industry: companyData.industry,
      company_size: companyData.employee_count,
      company_description: companyData.description,
      company_headquarters: companyData.headquarters,
      ...linkedInFields,
    };

    // Only add company_website if it's valid (or explicitly set to null to clear invalid data)
    if (companyData.website) {
      updateData.company_website = companyData.website;
      console.log("Setting valid company website:", companyData.website);
    } else {
      updateData.company_website = null;
      console.log("Clearing invalid company website");
    }

    const { error: updateError } = await supabase
      .from("campaign_contacts")
      .update(updateData)
      .eq("id", contactId);

    if (updateError) {
      console.error("Failed to update contact:", updateError);
      throw updateError;
    }

    console.log("Research completed successfully for contact:", contactId);

    return new Response(
      JSON.stringify({
        success: true,
        research_summary: contactSection,
        company_data: companyData,
        contact_id: contactId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in campaign-contact-research:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

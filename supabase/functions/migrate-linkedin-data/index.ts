import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// LinkedIn Data Parser
function parseLinkedInProfile(rawData: any): any {
  if (!rawData) return {};
  const text = typeof rawData === 'string' ? rawData : JSON.stringify(rawData);

  return {
    headline: extractHeadline(text),
    location: extractLocation(text),
    follower_count: extractFollowerCount(text),
    connection_count: extractConnectionCount(text),
    current_employer: extractCurrentEmployer(text),
    current_position_title: extractCurrentPosition(text),
    current_position_start_date: extractCurrentPositionStartDate(text),
    years_in_current_role: calculateYearsInCurrentRole(text),
    about: extractAbout(text),
    skills: extractSkills(text),
    languages: extractLanguages(text),
    total_years_experience: calculateTotalExperience(text),
    industry_focus: extractIndustryFocus(text),
    previous_employers: extractPreviousEmployers(text),
    education_summary: extractEducationSummary(text),
    highest_degree: extractHighestDegree(text),
    profile_completeness_score: calculateProfileCompleteness(text),
    last_activity_date: extractLastActivityDate(text),
  };
}

function extractHeadline(text: string): string | undefined {
  const match = text.match(/(?:Headline|Title):\s*([^\n]+)/i) || text.match(/^([^\n]+?)(?:\s*at\s+|\s*\||$)/m);
  return match?.[1]?.trim();
}

function extractLocation(text: string): string | undefined {
  const match = text.match(/(?:Location|Based in):\s*([^\n]+)/i);
  return match?.[1]?.trim();
}

function extractFollowerCount(text: string): number | undefined {
  const match = text.match(/(\d+(?:,\d+)*)\s*followers/i);
  return match ? parseInt(match[1].replace(/,/g, '')) : undefined;
}

function extractConnectionCount(text: string): number | undefined {
  const match = text.match(/(\d+(?:,\d+)*)\s*connections/i);
  return match ? parseInt(match[1].replace(/,/g, '')) : undefined;
}

function extractCurrentEmployer(text: string): string | undefined {
  const expSection = text.match(/Experience:?\s*([\s\S]*?)(?=Education:|Skills:|$)/i);
  if (!expSection) return undefined;
  const firstJob = expSection[1].match(/(?:at\s+)?([A-Z][^\n•·-]+?)(?:\n|•|·|-|$)/);
  return firstJob?.[1]?.trim();
}

function extractCurrentPosition(text: string): string | undefined {
  const expSection = text.match(/Experience:?\s*([\s\S]*?)(?=Education:|Skills:|$)/i);
  if (!expSection) return undefined;
  const firstTitle = expSection[1].match(/^([^\n]+?)(?:\s*at\s+|\n)/);
  return firstTitle?.[1]?.trim();
}

function extractCurrentPositionStartDate(text: string): string | undefined {
  const expSection = text.match(/Experience:?\s*([\s\S]*?)(?=Education:|Skills:|$)/i);
  if (!expSection) return undefined;
  const dateMatch = expSection[1].match(/(\w+\s+\d{4})\s*-\s*Present/i);
  if (dateMatch) {
    const date = new Date(dateMatch[1]);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  }
  return undefined;
}

function calculateYearsInCurrentRole(text: string): number | undefined {
  const expSection = text.match(/Experience:?\s*([\s\S]*?)(?=Education:|Skills:|$)/i);
  if (!expSection) return undefined;
  const dateMatch = expSection[1].match(/(\w+\s+\d{4})\s*-\s*Present/i);
  if (dateMatch) {
    const startDate = new Date(dateMatch[1]);
    const now = new Date();
    return Math.floor((now.getTime() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  }
  return undefined;
}

function extractAbout(text: string): string | undefined {
  const match = text.match(/(?:About|Summary):\s*([\s\S]*?)(?=\n(?:Experience|Education|Skills):|$)/i);
  return match?.[1]?.trim();
}

function extractSkills(text: string): string[] | undefined {
  const match = text.match(/Skills?:\s*([\s\S]*?)(?=\n[A-Z][a-z]+:|$)/i);
  if (!match) return undefined;
  const skills = match[1].split(/[,•·\n-]/).map(s => s.trim()).filter(s => s.length > 0 && s.length < 50);
  return skills.length > 0 ? skills : undefined;
}

function extractLanguages(text: string): string[] | undefined {
  const match = text.match(/Languages?:\s*([\s\S]*?)(?=\n[A-Z][a-z]+:|$)/i);
  if (!match) return undefined;
  const languages = match[1].split(/[,•·\n-]/).map(l => l.trim()).filter(l => l.length > 0);
  return languages.length > 0 ? languages : undefined;
}

function calculateTotalExperience(text: string): number | undefined {
  const expSection = text.match(/Experience:?\s*([\s\S]*?)(?=Education:|Skills:|$)/i);
  if (!expSection) return undefined;
  const yearMatches = expSection[1].match(/(\d+)\s*yr/g);
  if (!yearMatches) return undefined;
  let totalYears = 0;
  for (const match of yearMatches) {
    const years = match.match(/(\d+)/);
    if (years) totalYears += parseInt(years[1]);
  }
  return totalYears > 0 ? totalYears : undefined;
}

function extractIndustryFocus(text: string): string | undefined {
  const industries = ['Banking', 'Finance', 'Mortgage', 'Real Estate', 'Technology', 'Healthcare', 'Education'];
  for (const industry of industries) {
    if (text.toLowerCase().includes(industry.toLowerCase())) return industry;
  }
  return undefined;
}

function extractPreviousEmployers(text: string): string[] | undefined {
  const expSection = text.match(/Experience:?\s*([\s\S]*?)(?=Education:|Skills:|$)/i);
  if (!expSection) return undefined;
  const companies = expSection[1].match(/at\s+([A-Z][^\n•·-]+)/g);
  if (!companies || companies.length <= 1) return undefined;
  const employers = companies.slice(1, 6).map(c => c.replace(/^at\s+/, '').trim());
  return employers.length > 0 ? employers : undefined;
}

function extractEducationSummary(text: string): string | undefined {
  const match = text.match(/Education:\s*([\s\S]*?)(?=\n(?:Experience|Skills|Licenses):|$)/i);
  return match?.[1]?.trim();
}

function extractHighestDegree(text: string): string | undefined {
  const degrees = ['PhD', 'Doctorate', "Master's", 'MBA', "Bachelor's", 'Associates'];
  const eduSection = extractEducationSummary(text);
  if (!eduSection) return undefined;
  for (const degree of degrees) {
    if (eduSection.includes(degree)) return degree;
  }
  return undefined;
}

function calculateProfileCompleteness(text: string): number | undefined {
  let score = 0;
  if (extractHeadline(text)) score += 15;
  if (extractLocation(text)) score += 10;
  if (extractAbout(text)) score += 20;
  if (extractCurrentEmployer(text)) score += 25;
  if (extractEducationSummary(text)) score += 15;
  if (extractSkills(text)?.length) score += 10;
  return score > 0 ? score : undefined;
}

function extractLastActivityDate(text: string): string | undefined {
  const match = text.match(/Last activity:\s*(\d{4}-\d{2}-\d{2})/i);
  return match?.[1];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting LinkedIn data migration...");

    // Fetch all contacts that have metadata but no linkedin_headline
    const { data: contacts, error: fetchError } = await supabaseClient
      .from("campaign_contacts")
      .select("id, contact_name, metadata")
      .is("linkedin_headline", null)
      .not("metadata", "is", null);

    if (fetchError) {
      throw new Error(`Failed to fetch contacts: ${fetchError.message}`);
    }

    if (!contacts || contacts.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No contacts found to migrate",
          processed: 0,
          skipped: 0,
          errors: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${contacts.length} contacts to process`);

    let processed = 0;
    let skipped = 0;
    let errors = 0;
    const errorDetails: any[] = [];

    // Process each contact
    for (const contact of contacts) {
      try {
        console.log(`Processing contact: ${contact.contact_name} (${contact.id})`);
        
        // Parse the LinkedIn data
        const parsedData = parseLinkedInProfile(contact.metadata);
        
        // Skip if no meaningful data was parsed
        if (!parsedData.headline && !parsedData.current_employer) {
          console.log(`Skipping ${contact.contact_name} - no parseable LinkedIn data`);
          skipped++;
          continue;
        }

        // Update the contact with parsed data
        const { error: updateError } = await supabaseClient
          .from("campaign_contacts")
          .update({
            linkedin_headline: parsedData.headline,
            linkedin_location: parsedData.location,
            linkedin_follower_count: parsedData.follower_count,
            linkedin_connection_count: parsedData.connection_count,
            linkedin_profile_image_url: parsedData.profile_image_url,
            current_employer: parsedData.current_employer,
            current_position_title: parsedData.current_position_title,
            current_position_start_date: parsedData.current_position_start_date,
            years_in_current_role: parsedData.years_in_current_role,
            linkedin_about: parsedData.about,
            linkedin_skills: parsedData.skills,
            languages: parsedData.languages,
            total_years_experience: parsedData.total_years_experience,
            industry_focus: parsedData.industry_focus,
            previous_employers: parsedData.previous_employers,
            education_summary: parsedData.education_summary,
            highest_degree: parsedData.highest_degree,
            profile_completeness_score: parsedData.profile_completeness_score,
            last_linkedin_activity_date: parsedData.last_activity_date,
          })
          .eq("id", contact.id);

        if (updateError) {
          throw updateError;
        }

        processed++;
        console.log(`✓ Successfully processed ${contact.contact_name}`);
        
      } catch (error) {
        console.error(`Error processing contact ${contact.id}:`, error);
        errors++;
        errorDetails.push({
          contact_id: contact.id,
          contact_name: contact.contact_name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const summary = {
      message: "LinkedIn data migration completed",
      total_contacts: contacts.length,
      processed,
      skipped,
      errors,
      error_details: errorDetails,
    };

    console.log("Migration summary:", summary);

    return new Response(
      JSON.stringify(summary),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error) {
    console.error("Migration error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred",
        details: String(error)
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});

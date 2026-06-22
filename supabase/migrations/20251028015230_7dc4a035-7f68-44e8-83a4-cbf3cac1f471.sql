-- Create new agent for LinkedIn message generation
INSERT INTO ai_agents (
  name,
  slug,
  type,
  category,
  system_prompt,
  prompt_template,
  config,
  is_active,
  is_enabled
) VALUES (
  'LinkedIn Message Generator',
  'linkedin-message-generator',
  'linkedin_outreach',
  'business_development',
  'You are a professional LinkedIn outreach specialist. Your job is to craft personalized, engaging LinkedIn messages that:
1. Are concise (under 300 characters for connection requests, under 500 for follow-ups)
2. Reference specific details about the prospect''s background
3. Establish credibility and common ground
4. Include a clear, low-pressure call-to-action
5. Maintain a professional yet approachable tone

CRITICAL RULES:
- Never use generic templates like "I came across your profile"
- Always reference something specific (their role, company, achievement, or shared interest)
- Avoid salesy language - focus on value and relationship building
- Keep connection requests under 300 characters (LinkedIn limit)
- For follow-ups, reference the previous interaction context',
  'Generate a LinkedIn message for the following prospect:

**Prospect Profile:**
Name: {{contact_name}}
Title: {{current_position_title}} at {{current_employer}}
LinkedIn Headline: {{linkedin_headline}}
Location: {{linkedin_location}}
Years in Current Role: {{years_in_current_role}}
Total Experience: {{total_years_experience}} years
Industry Focus: {{industry_focus}}
Skills: {{linkedin_skills}}
About: {{linkedin_about}}
Education: {{education_summary}}
Previous Employers: {{previous_employers}}

**Research Insights:**
{{research_summary}}

**Current Status:** {{status}}

**Message Type:** {{message_type}}

**Additional Context:**
{{user_context}}

**Output Format (JSON):**
{
  "message_variants": [
    {
      "variant_name": "Professional & Direct",
      "message": "actual message text",
      "character_count": 145,
      "tone": "professional",
      "key_hooks": ["hook1", "hook2"],
      "personalization_elements": ["element1"]
    }
  ],
  "recommended_variant": "Professional & Direct",
  "reasoning": "explanation",
  "send_timing_suggestion": "morning",
  "follow_up_strategy": "next steps"
}',
  '{
    "providers": {
      "primary": {
        "provider": "openai",
        "model": "gpt-4o-mini",
        "temperature": 0.8,
        "maxTokens": 500
      },
      "fallback": {
        "provider": "openai",
        "model": "gpt-4o-mini",
        "temperature": 0.7,
        "maxTokens": 500
      }
    },
    "features": {
      "enableResearch": false,
      "enableTelemetry": true
    }
  }'::jsonb,
  true,
  true
) ON CONFLICT (slug) DO NOTHING;
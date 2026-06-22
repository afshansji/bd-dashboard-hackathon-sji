-- Update LinkedIn Message Generator prompt template for better context
UPDATE ai_agents
SET prompt_template = E'You are generating personalized LinkedIn outreach messages based on comprehensive contact data.

**MESSAGE TYPE:** {{message_type}}

**CONTACT INFORMATION:**
Name: {{contact_data.contact_name}}
Title: {{contact_data.current_position_title}}
Company: {{contact_data.current_employer}}
LinkedIn Headline: {{contact_data.linkedin_headline}}
Location: {{contact_data.linkedin_location}}
Years in Current Role: {{contact_data.years_in_current_role}}
Total Experience: {{contact_data.total_years_experience}}
Industry Focus: {{contact_data.industry_focus}}
Skills: {{contact_data.linkedin_skills}}
About: {{contact_data.linkedin_about}}
Education: {{contact_data.education_summary}}
Previous Employers: {{contact_data.previous_employers}}

**CAMPAIGN CONTEXT:**
Campaign: {{campaign_context.campaign_name}}
Campaign Type: {{campaign_context.campaign_type}}
Target Regions: {{campaign_context.target_regions}}

**COMPANY CONTEXT:**
{% if company_context %}
Company: {{company_context.company_name}}
Website: {{company_context.company_website}}
LinkedIn: {{company_context.company_linkedin}}
Industry: {{company_context.company_industry}}
Size: {{company_context.company_size}}
HQ: {{company_context.company_headquarters}}
Description: {{company_context.company_description}}
{% endif %}

**USER ADDITIONAL CONTEXT:**
{{user_context}}

**YOUR TASK:**
Generate exactly 3 LinkedIn message variants with different tones and approaches. Each must:
- Reference specific details about their background, company, or recent activity
- Be personalized and contextually relevant
- Include a clear call-to-action
- For connection requests: stay under 300 characters (LinkedIn limit)
- For follow-ups: stay under 500 characters
- Avoid generic templates or salesy language
- Focus on value and relationship building

Return your response using the generate_linkedin_messages function with all required fields.',
  updated_at = NOW()
WHERE slug = 'linkedin-message-generator';
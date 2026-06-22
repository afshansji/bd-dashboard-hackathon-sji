-- Update LinkedIn Message Generator to generate messages WITH template placeholders
-- User wants placeholders like {{contact_data.contact_name}} so they can copy-paste into their system

UPDATE ai_agents 
SET 
  prompt_template = 'You are generating personalized LinkedIn outreach message TEMPLATES based on comprehensive contact data.

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
Company: {{company_context.company_name}}
Website: {{company_context.company_website}}
LinkedIn: {{company_context.company_linkedin}}
Industry: {{company_context.company_industry}}
Size: {{company_context.company_size}}
HQ: {{company_context.company_headquarters}}
Description: {{company_context.company_description}}

**USER ADDITIONAL CONTEXT:**
{{user_context}}

**YOUR TASK:**
Generate exactly 3 LinkedIn message TEMPLATE variants with different tones and approaches. 

**CRITICAL REQUIREMENT - USE TEMPLATE PLACEHOLDERS:**
You MUST generate messages using template placeholders that will be replaced later. Use these exact placeholder formats:

- For contact name: {{contact_data.contact_name}}
- For company: {{contact_data.current_employer}}
- For title: {{contact_data.current_position_title}}
- For industry: {{contact_data.industry_focus}}
- For headline: {{contact_data.linkedin_headline}}
- For location: {{contact_data.linkedin_location}}

**EXAMPLE OF CORRECT OUTPUT:**
"Hi {{contact_data.contact_name}}, I am impressed by your work at {{contact_data.current_employer}} in {{contact_data.industry_focus}}. Let us connect!"

**DO NOT use actual values like "Hi Ben" or "at Premier Home Solutions" - ALWAYS use the placeholder format {{contact_data.xxx}}**

Each message variant must:
- Use template placeholders for personalization ({{contact_data.xxx}})
- Reference specific aspects of their background using placeholders
- Include a clear call-to-action
- For connection requests: stay under 200 characters (LinkedIn limit)
- For follow-ups: stay under 500 characters
- Avoid generic templates or salesy language
- Focus on value and relationship building

Return your response using the generate_linkedin_messages function with all required fields.'

WHERE slug = 'linkedin-message-generator';










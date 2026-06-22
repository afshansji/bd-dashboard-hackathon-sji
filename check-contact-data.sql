-- Check what data is stored for Wadud Shuvro contact
-- Run this in Supabase SQL Editor

SELECT 
  contact_name,
  contact_company,
  company_website,
  company_linkedin_url,
  company_description,
  company_industry,
  company_size,
  company_headquarters,
  last_enriched_at,
  research_summary
FROM campaign_contacts
WHERE contact_name ILIKE '%Wadud%Shuvro%'
   OR contact_name ILIKE '%Shuvro%'
LIMIT 1;















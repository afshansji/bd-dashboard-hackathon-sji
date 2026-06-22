-- Add structured LinkedIn fields to campaign_contacts table
ALTER TABLE campaign_contacts 
ADD COLUMN IF NOT EXISTS linkedin_headline TEXT,
ADD COLUMN IF NOT EXISTS linkedin_location TEXT,
ADD COLUMN IF NOT EXISTS linkedin_follower_count INTEGER,
ADD COLUMN IF NOT EXISTS linkedin_connection_count INTEGER,
ADD COLUMN IF NOT EXISTS linkedin_profile_image_url TEXT,
ADD COLUMN IF NOT EXISTS current_employer TEXT,
ADD COLUMN IF NOT EXISTS current_position_title TEXT,
ADD COLUMN IF NOT EXISTS current_position_start_date DATE,
ADD COLUMN IF NOT EXISTS years_in_current_role NUMERIC,
ADD COLUMN IF NOT EXISTS linkedin_about TEXT,
ADD COLUMN IF NOT EXISTS linkedin_skills TEXT[],
ADD COLUMN IF NOT EXISTS languages TEXT[],
ADD COLUMN IF NOT EXISTS total_years_experience NUMERIC,
ADD COLUMN IF NOT EXISTS industry_focus TEXT,
ADD COLUMN IF NOT EXISTS previous_employers TEXT[],
ADD COLUMN IF NOT EXISTS education_summary TEXT,
ADD COLUMN IF NOT EXISTS highest_degree TEXT,
ADD COLUMN IF NOT EXISTS profile_completeness_score INTEGER,
ADD COLUMN IF NOT EXISTS last_linkedin_activity_date DATE;

COMMENT ON COLUMN campaign_contacts.linkedin_headline IS 'Professional headline from LinkedIn profile';
COMMENT ON COLUMN campaign_contacts.linkedin_location IS 'Geographic location from LinkedIn';
COMMENT ON COLUMN campaign_contacts.current_employer IS 'Current company name';
COMMENT ON COLUMN campaign_contacts.current_position_title IS 'Current job title';
COMMENT ON COLUMN campaign_contacts.profile_completeness_score IS 'Score from 0-100 indicating profile data quality';
-- Add lead_quality_score column to campaign_contacts
ALTER TABLE public.campaign_contacts 
ADD COLUMN IF NOT EXISTS lead_quality_score integer DEFAULT NULL;

-- Add index for filtering by quality score
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_lead_quality_score 
ON public.campaign_contacts(lead_quality_score) 
WHERE lead_quality_score IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.campaign_contacts.lead_quality_score IS 'Lead quality score (0-100) calculated by AI enrichment agent';
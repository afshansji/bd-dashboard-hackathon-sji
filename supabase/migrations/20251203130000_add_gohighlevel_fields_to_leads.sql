-- Add GoHighLevel integration fields to leads table
-- This allows tracking which GoHighLevel contacts correspond to local leads

ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS gohighlevel_contact_id TEXT,
ADD COLUMN IF NOT EXISTS gohighlevel_last_synced_at TIMESTAMPTZ;

-- Create index for faster lookups by GoHighLevel contact ID
CREATE INDEX IF NOT EXISTS idx_leads_gohighlevel_contact_id
ON public.leads(gohighlevel_contact_id);

-- Add comment for documentation
COMMENT ON COLUMN public.leads.gohighlevel_contact_id IS 'GoHighLevel CRM contact ID for sync tracking';
COMMENT ON COLUMN public.leads.gohighlevel_last_synced_at IS 'Timestamp of last successful sync to GoHighLevel';

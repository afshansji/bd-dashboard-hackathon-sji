-- Create campaign_contacts table for proper relational storage
CREATE TABLE public.campaign_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.bd_campaigns(id) ON DELETE CASCADE,
  
  -- Contact Information
  contact_name text NOT NULL,
  contact_email text,
  contact_linkedin_url text,
  contact_company text,
  contact_title text,
  contact_phone text,
  
  -- Campaign Pipeline Status
  status text NOT NULL DEFAULT 'identified',
  
  -- Exa Integration
  exa_item_id text,
  exa_score numeric,
  
  -- Research & Enrichment
  research_summary jsonb,
  last_enriched_at timestamp with time zone,
  
  -- Additional metadata from Exa
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Audit fields
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Ensure uniqueness
  CONSTRAINT unique_campaign_exa_item UNIQUE (campaign_id, exa_item_id),
  CONSTRAINT unique_campaign_email UNIQUE (campaign_id, contact_email),
  
  -- Check constraint for valid status values
  CONSTRAINT valid_contact_status CHECK (status IN (
    'identified',
    'researched',
    'contacted_linkedin',
    'connected',
    'messaged',
    'contacted_email',
    'responded',
    'meeting_booked'
  ))
);

-- Add indexes for performance
CREATE INDEX idx_campaign_contacts_campaign_id ON public.campaign_contacts(campaign_id);
CREATE INDEX idx_campaign_contacts_status ON public.campaign_contacts(status);
CREATE INDEX idx_campaign_contacts_exa_item_id ON public.campaign_contacts(exa_item_id) WHERE exa_item_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.campaign_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view campaign contacts"
  ON public.campaign_contacts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Campaign collaborators can manage contacts"
  ON public.campaign_contacts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.bd_campaigns
      WHERE bd_campaigns.id = campaign_contacts.campaign_id
      AND (
        bd_campaigns.created_by = auth.uid()
        OR bd_campaigns.owned_by = auth.uid()
        OR has_role(auth.uid(), 'super_admin'::app_role)
        OR has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );

-- Add updated_at trigger
CREATE TRIGGER update_campaign_contacts_updated_at
  BEFORE UPDATE ON public.campaign_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
-- Create campaign_brands junction table
CREATE TABLE public.campaign_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.bd_campaigns(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(campaign_id, brand_id)
);

-- Enable RLS
ALTER TABLE public.campaign_brands ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaign_brands
CREATE POLICY "Authenticated users can view campaign brands"
ON public.campaign_brands
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Campaign collaborators can manage campaign brands"
ON public.campaign_brands
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.bd_campaigns
    WHERE bd_campaigns.id = campaign_brands.campaign_id
    AND (
      bd_campaigns.created_by = auth.uid()
      OR bd_campaigns.owned_by = auth.uid()
      OR has_role(auth.uid(), 'super_admin')
      OR has_role(auth.uid(), 'admin')
    )
  )
);

-- Add indexes for performance
CREATE INDEX idx_campaign_brands_campaign_id ON public.campaign_brands(campaign_id);
CREATE INDEX idx_campaign_brands_brand_id ON public.campaign_brands(brand_id);

-- Migrate existing brand_id data to campaign_brands
INSERT INTO public.campaign_brands (campaign_id, brand_id)
SELECT id, brand_id
FROM public.bd_campaigns
WHERE brand_id IS NOT NULL
ON CONFLICT (campaign_id, brand_id) DO NOTHING;
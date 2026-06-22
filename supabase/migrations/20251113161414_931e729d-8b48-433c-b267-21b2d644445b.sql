-- Create campaign_tags table for persistent tag management
CREATE TABLE campaign_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES bd_campaigns(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  usage_count INTEGER DEFAULT 0,
  UNIQUE(campaign_id, tag_name)
);

-- Create indexes for performance
CREATE INDEX idx_campaign_tags_campaign ON campaign_tags(campaign_id);
CREATE INDEX idx_campaign_tags_name ON campaign_tags(tag_name);

-- Enable RLS
ALTER TABLE campaign_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view campaign tags"
  ON campaign_tags
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Campaign collaborators can manage tags"
  ON campaign_tags
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM bd_campaigns
      WHERE bd_campaigns.id = campaign_tags.campaign_id
      AND (
        bd_campaigns.created_by = auth.uid()
        OR bd_campaigns.owned_by = auth.uid()
        OR has_role(auth.uid(), 'super_admin'::app_role)
        OR has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );
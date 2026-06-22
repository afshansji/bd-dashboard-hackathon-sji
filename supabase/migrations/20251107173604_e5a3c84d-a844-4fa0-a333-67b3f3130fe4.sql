-- Create separate table for campaign KPIs
CREATE TABLE IF NOT EXISTS public.campaign_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.bd_campaigns(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  unit text,
  current_value numeric DEFAULT 0,
  target_value numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.campaign_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view campaign KPIs"
  ON public.campaign_kpis FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage campaign KPIs"
  ON public.campaign_kpis FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bd_campaigns
      WHERE bd_campaigns.id = campaign_kpis.campaign_id
      AND (
        bd_campaigns.created_by = auth.uid()
        OR bd_campaigns.owned_by = auth.uid()
        OR has_role(auth.uid(), 'super_admin'::app_role)
        OR has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_campaign_kpis_updated_at
  BEFORE UPDATE ON public.campaign_kpis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
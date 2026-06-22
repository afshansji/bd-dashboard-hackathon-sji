-- =====================================================
-- Phase 1: Analytics Data Infrastructure
-- =====================================================

-- 1. Create analytics_data table for universal metric tracking
CREATE TABLE IF NOT EXISTS public.analytics_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('campaigns', 'deals', 'leads', 'ai_agents', 'eod', 'tasks', 'general')),
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  dimensions jsonb DEFAULT '{}',
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 2. Create user_performance_metrics table for team analytics
CREATE TABLE IF NOT EXISTS public.user_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  metric_period text NOT NULL CHECK (metric_period IN ('daily', 'weekly', 'monthly')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  
  -- Campaign metrics
  campaigns_owned integer DEFAULT 0,
  contacts_reached integer DEFAULT 0,
  responses_received integer DEFAULT 0,
  meetings_booked integer DEFAULT 0,
  deals_closed integer DEFAULT 0,
  
  -- Deal metrics
  deals_created integer DEFAULT 0,
  deals_won integer DEFAULT 0,
  deals_lost integer DEFAULT 0,
  total_deal_value numeric DEFAULT 0,
  
  -- Activity metrics
  ai_agents_run integer DEFAULT 0,
  eod_submissions integer DEFAULT 0,
  tasks_completed integer DEFAULT 0,
  
  -- Calculated scores
  performance_score numeric DEFAULT 0,
  efficiency_rating numeric DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, metric_period, period_start)
);

-- 3. Create campaign_financial_data table for ROI tracking
CREATE TABLE IF NOT EXISTS public.campaign_financial_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.bd_campaigns(id) ON DELETE CASCADE UNIQUE,
  
  -- Costs
  total_budget numeric DEFAULT 0,
  actual_spend numeric DEFAULT 0,
  cost_per_contact numeric DEFAULT 50,
  cost_per_meeting numeric DEFAULT 0,
  
  -- Revenue
  deals_revenue numeric DEFAULT 0,
  average_deal_value numeric DEFAULT 5000,
  projected_revenue numeric DEFAULT 0,
  
  -- ROI calculations
  roi_percentage numeric DEFAULT 0,
  cost_per_deal numeric DEFAULT 0,
  
  last_calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_data_source_date ON public.analytics_data(source, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_data_metric_name ON public.analytics_data(metric_name, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_performance_user_period ON public.user_performance_metrics(user_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_user_performance_period ON public.user_performance_metrics(metric_period, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_financial_campaign ON public.campaign_financial_data(campaign_id);

-- 5. Function to calculate user performance metrics
CREATE OR REPLACE FUNCTION public.calculate_user_performance_metrics(
  p_user_id uuid,
  p_period_start date,
  p_period_end date
) RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_campaigns_owned integer := 0;
  v_contacts_reached integer := 0;
  v_responses_received integer := 0;
  v_meetings_booked integer := 0;
  v_deals_closed integer := 0;
  v_deals_created integer := 0;
  v_deals_won integer := 0;
  v_deals_lost integer := 0;
  v_total_deal_value numeric := 0;
  v_ai_agents_run integer := 0;
  v_eod_submissions integer := 0;
  v_tasks_completed integer := 0;
  v_performance_score numeric := 0;
  v_efficiency_rating numeric := 0;
BEGIN
  -- Aggregate campaign data
  SELECT 
    COUNT(DISTINCT c.id),
    COALESCE(SUM(c.actual_contacts_reached), 0),
    COALESCE(SUM(c.responses_received), 0),
    COALESCE(SUM(c.meetings_booked), 0),
    COALESCE(SUM(c.deals_generated), 0)
  INTO
    v_campaigns_owned,
    v_contacts_reached,
    v_responses_received,
    v_meetings_booked,
    v_deals_closed
  FROM public.bd_campaigns c
  WHERE (c.owned_by = p_user_id OR c.created_by = p_user_id)
    AND c.created_at >= p_period_start::timestamptz
    AND c.created_at <= (p_period_end::timestamptz + interval '1 day' - interval '1 second');
  
  -- Aggregate deal data
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'won'),
    COUNT(*) FILTER (WHERE status = 'lost'),
    COALESCE(SUM(amount) FILTER (WHERE status = 'won'), 0)
  INTO
    v_deals_created,
    v_deals_won,
    v_deals_lost,
    v_total_deal_value
  FROM public.deals d
  WHERE d.owner_id = p_user_id
    AND d.created_at >= p_period_start::timestamptz
    AND d.created_at <= (p_period_end::timestamptz + interval '1 day' - interval '1 second');
  
  -- Aggregate AI agent runs
  SELECT COUNT(*)
  INTO v_ai_agents_run
  FROM public.ai_agent_runs
  WHERE executed_by = p_user_id
    AND created_at >= p_period_start::timestamptz
    AND created_at <= (p_period_end::timestamptz + interval '1 day' - interval '1 second');
  
  -- Aggregate task completions
  SELECT COUNT(*)
  INTO v_tasks_completed
  FROM public.project_tasks
  WHERE status = 'completed'
    AND completed_at >= p_period_start::timestamptz
    AND completed_at <= (p_period_end::timestamptz + interval '1 day' - interval '1 second');
  
  -- Calculate performance score (weighted formula)
  v_performance_score := (
    (v_deals_won * 100) +
    (v_meetings_booked * 20) +
    (v_responses_received * 5) +
    (v_contacts_reached * 1)
  );
  
  -- Calculate efficiency rating
  IF v_contacts_reached > 0 THEN
    v_efficiency_rating := (v_deals_closed::numeric / v_contacts_reached) * 100;
  ELSE
    v_efficiency_rating := 0;
  END IF;
  
  -- Build result JSON
  v_result := jsonb_build_object(
    'campaigns_owned', v_campaigns_owned,
    'contacts_reached', v_contacts_reached,
    'responses_received', v_responses_received,
    'meetings_booked', v_meetings_booked,
    'deals_closed', v_deals_closed,
    'deals_created', v_deals_created,
    'deals_won', v_deals_won,
    'deals_lost', v_deals_lost,
    'total_deal_value', v_total_deal_value,
    'ai_agents_run', v_ai_agents_run,
    'eod_submissions', v_eod_submissions,
    'tasks_completed', v_tasks_completed,
    'performance_score', v_performance_score,
    'efficiency_rating', v_efficiency_rating
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Function to update campaign financial data
CREATE OR REPLACE FUNCTION public.update_campaign_financials(p_campaign_id uuid)
RETURNS void AS $$
DECLARE
  v_contacts integer;
  v_deals integer;
  v_cost_per_contact numeric;
  v_avg_deal_value numeric;
  v_actual_spend numeric;
  v_deals_revenue numeric;
BEGIN
  -- Get campaign data
  SELECT 
    COALESCE(actual_contacts_reached, 0),
    COALESCE(deals_generated, 0)
  INTO v_contacts, v_deals
  FROM public.bd_campaigns
  WHERE id = p_campaign_id;
  
  -- Get or create financial record with default values
  INSERT INTO public.campaign_financial_data (campaign_id, cost_per_contact, average_deal_value)
  VALUES (p_campaign_id, 50, 5000)
  ON CONFLICT (campaign_id) DO NOTHING;
  
  -- Get current cost settings
  SELECT cost_per_contact, average_deal_value
  INTO v_cost_per_contact, v_avg_deal_value
  FROM public.campaign_financial_data
  WHERE campaign_id = p_campaign_id;
  
  -- Calculate values
  v_actual_spend := v_contacts * v_cost_per_contact;
  v_deals_revenue := v_deals * v_avg_deal_value;
  
  -- Update financial calculations
  UPDATE public.campaign_financial_data
  SET
    actual_spend = v_actual_spend,
    deals_revenue = v_deals_revenue,
    roi_percentage = CASE 
      WHEN v_actual_spend > 0 THEN 
        ((v_deals_revenue - v_actual_spend) / v_actual_spend) * 100
      ELSE 0
    END,
    cost_per_deal = CASE 
      WHEN v_deals > 0 THEN v_actual_spend / v_deals
      ELSE 0
    END,
    cost_per_meeting = CASE
      WHEN (SELECT meetings_booked FROM public.bd_campaigns WHERE id = p_campaign_id) > 0
      THEN v_actual_spend / (SELECT meetings_booked FROM public.bd_campaigns WHERE id = p_campaign_id)
      ELSE 0
    END,
    last_calculated_at = now(),
    updated_at = now()
  WHERE campaign_id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Trigger function to log campaign analytics
CREATE OR REPLACE FUNCTION public.log_campaign_analytics()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Log contacts reached changes
    IF NEW.actual_contacts_reached IS DISTINCT FROM OLD.actual_contacts_reached THEN
      INSERT INTO public.analytics_data (source, metric_name, metric_value, dimensions)
      VALUES (
        'campaigns',
        'contacts_reached',
        COALESCE(NEW.actual_contacts_reached, 0) - COALESCE(OLD.actual_contacts_reached, 0),
        jsonb_build_object(
          'campaign_id', NEW.id::text,
          'campaign_name', NEW.name,
          'campaign_slug', NEW.slug
        )
      );
    END IF;
    
    -- Log response changes
    IF NEW.responses_received IS DISTINCT FROM OLD.responses_received THEN
      INSERT INTO public.analytics_data (source, metric_name, metric_value, dimensions)
      VALUES (
        'campaigns',
        'responses_received',
        COALESCE(NEW.responses_received, 0) - COALESCE(OLD.responses_received, 0),
        jsonb_build_object(
          'campaign_id', NEW.id::text,
          'campaign_name', NEW.name,
          'campaign_slug', NEW.slug
        )
      );
    END IF;
    
    -- Log meetings booked changes
    IF NEW.meetings_booked IS DISTINCT FROM OLD.meetings_booked THEN
      INSERT INTO public.analytics_data (source, metric_name, metric_value, dimensions)
      VALUES (
        'campaigns',
        'meetings_booked',
        COALESCE(NEW.meetings_booked, 0) - COALESCE(OLD.meetings_booked, 0),
        jsonb_build_object(
          'campaign_id', NEW.id::text,
          'campaign_name', NEW.name,
          'campaign_slug', NEW.slug
        )
      );
    END IF;
    
    -- Log deals generated changes
    IF NEW.deals_generated IS DISTINCT FROM OLD.deals_generated THEN
      INSERT INTO public.analytics_data (source, metric_name, metric_value, dimensions)
      VALUES (
        'campaigns',
        'deals_generated',
        COALESCE(NEW.deals_generated, 0) - COALESCE(OLD.deals_generated, 0),
        jsonb_build_object(
          'campaign_id', NEW.id::text,
          'campaign_name', NEW.name,
          'campaign_slug', NEW.slug
        )
      );
    END IF;
    
    -- Update financial data
    PERFORM public.update_campaign_financials(NEW.id);
  ELSIF TG_OP = 'INSERT' THEN
    -- Initialize financial data for new campaign
    PERFORM public.update_campaign_financials(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. Create trigger for campaign analytics
DROP TRIGGER IF EXISTS campaign_analytics_trigger ON public.bd_campaigns;
CREATE TRIGGER campaign_analytics_trigger
AFTER INSERT OR UPDATE ON public.bd_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.log_campaign_analytics();

-- 9. Enable RLS on new tables
ALTER TABLE public.analytics_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_financial_data ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies for analytics_data
CREATE POLICY "Authenticated users can view analytics"
  ON public.analytics_data FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage analytics"
  ON public.analytics_data FOR ALL
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert analytics"
  ON public.analytics_data FOR INSERT
  WITH CHECK (true);

-- 11. RLS Policies for user_performance_metrics
CREATE POLICY "Users can view own performance"
  ON public.user_performance_metrics FOR SELECT
  USING (
    user_id = auth.uid() 
    OR has_role(auth.uid(), 'admin') 
    OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins can manage performance metrics"
  ON public.user_performance_metrics FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "System can insert performance metrics"
  ON public.user_performance_metrics FOR INSERT
  WITH CHECK (true);

-- 12. RLS Policies for campaign_financial_data
CREATE POLICY "Campaign collaborators can view financials"
  ON public.campaign_financial_data FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bd_campaigns c
      WHERE c.id = campaign_financial_data.campaign_id
        AND (
          c.owned_by = auth.uid() 
          OR c.created_by = auth.uid() 
          OR has_role(auth.uid(), 'admin')
          OR has_role(auth.uid(), 'super_admin')
        )
    )
  );

CREATE POLICY "Campaign collaborators can update financials"
  ON public.campaign_financial_data FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.bd_campaigns c
      WHERE c.id = campaign_financial_data.campaign_id
        AND (
          c.owned_by = auth.uid() 
          OR c.created_by = auth.uid() 
          OR has_role(auth.uid(), 'admin')
          OR has_role(auth.uid(), 'super_admin')
        )
    )
  );

CREATE POLICY "System can manage campaign financials"
  ON public.campaign_financial_data FOR ALL
  USING (true);

-- 13. Backfill financial data for existing campaigns
INSERT INTO public.campaign_financial_data (campaign_id)
SELECT id FROM public.bd_campaigns
ON CONFLICT (campaign_id) DO NOTHING;

-- 14. Update financial data for all existing campaigns
DO $$
DECLARE
  campaign_record RECORD;
BEGIN
  FOR campaign_record IN SELECT id FROM public.bd_campaigns LOOP
    PERFORM public.update_campaign_financials(campaign_record.id);
  END LOOP;
END $$;
-- Create control_tower_health_snapshots table
CREATE TABLE IF NOT EXISTS public.control_tower_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  overall_health_score NUMERIC(5,2) NOT NULL CHECK (overall_health_score >= 0 AND overall_health_score <= 100),
  sync_success_rate_24h NUMERIC(5,2) CHECK (sync_success_rate_24h >= 0 AND sync_success_rate_24h <= 100),
  sync_success_rate_7d NUMERIC(5,2) CHECK (sync_success_rate_7d >= 0 AND sync_success_rate_7d <= 100),
  avg_sync_duration_ms INTEGER,
  failed_syncs_count_24h INTEGER DEFAULT 0,
  pending_push_items INTEGER DEFAULT 0,
  data_drift_score NUMERIC(5,2) CHECK (data_drift_score >= 0 AND data_drift_score <= 100),
  api_response_time_ms INTEGER,
  last_successful_pull TIMESTAMPTZ,
  last_successful_push TIMESTAMPTZ,
  unmapped_owners_count INTEGER DEFAULT 0,
  unmapped_pms_count INTEGER DEFAULT 0,
  unmapped_pods_count INTEGER DEFAULT 0,
  stale_deals_count INTEGER DEFAULT 0,
  metrics_detail JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for health_snapshots
CREATE INDEX IF NOT EXISTS idx_health_snapshots_snapshot_at ON public.control_tower_health_snapshots(snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_snapshots_overall_score ON public.control_tower_health_snapshots(overall_health_score);

-- Create control_tower_alerts table
CREATE TABLE IF NOT EXISTS public.control_tower_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('sync_failure', 'high_latency', 'data_drift', 'mapping_issue', 'stale_data', 'api_unreachable')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT CHECK (entity_type IN ('deal', 'employee', 'pod', 'client')),
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'ignored')),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for alerts
CREATE INDEX IF NOT EXISTS idx_alerts_status_severity ON public.control_tower_alerts(status, severity, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON public.control_tower_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_entity ON public.control_tower_alerts(entity_type, entity_id) WHERE entity_type IS NOT NULL;

-- Create control_tower_alert_config table
CREATE TABLE IF NOT EXISTS public.control_tower_alert_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL UNIQUE CHECK (alert_type IN ('sync_failure', 'high_latency', 'data_drift', 'mapping_issue', 'stale_data', 'api_unreachable')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  severity_threshold TEXT NOT NULL DEFAULT 'warning' CHECK (severity_threshold IN ('info', 'warning', 'error', 'critical')),
  threshold_value NUMERIC,
  check_interval_minutes INTEGER NOT NULL DEFAULT 15,
  notification_channels JSONB DEFAULT '["in_app"]'::jsonb,
  notification_recipients JSONB DEFAULT '[]'::jsonb,
  auto_resolve_after_hours INTEGER DEFAULT 24,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default alert configurations
INSERT INTO public.control_tower_alert_config (alert_type, enabled, severity_threshold, threshold_value, description) VALUES
  ('sync_failure', true, 'error', 3, '3 or more failed syncs within 1 hour'),
  ('high_latency', true, 'warning', 5000, 'Average sync duration exceeds 5 seconds'),
  ('data_drift', true, 'warning', 60, 'Data drift score below 60%'),
  ('mapping_issue', true, 'warning', 10, 'More than 10 unmapped owners, PMs, or PODs'),
  ('stale_data', true, 'info', 24, 'No successful sync in last 24 hours'),
  ('api_unreachable', true, 'critical', 3, 'Control Tower API unreachable (3 consecutive failures)')
ON CONFLICT (alert_type) DO NOTHING;

-- Create calculate_health_score function
CREATE OR REPLACE FUNCTION public.calculate_health_score(
  p_sync_success_rate_24h NUMERIC,
  p_api_response_time_ms INTEGER,
  p_unmapped_total INTEGER,
  p_total_deals INTEGER,
  p_hours_since_last_sync NUMERIC,
  p_failed_count_24h INTEGER,
  p_total_syncs_24h INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sync_score NUMERIC;
  api_score NUMERIC;
  mapping_score NUMERIC;
  freshness_score NUMERIC;
  error_score NUMERIC;
  total_health_score NUMERIC;
BEGIN
  -- Sync success rate (40% weight)
  sync_score := COALESCE(p_sync_success_rate_24h, 0) * 0.4;
  
  -- API responsiveness (20% weight) - normalized to 10 seconds max
  api_score := GREATEST(0, (1 - (COALESCE(p_api_response_time_ms, 0)::NUMERIC / 10000.0)) * 100) * 0.2;
  
  -- Data completeness (20% weight) - mapping completion
  IF p_total_deals > 0 THEN
    mapping_score := (1 - (COALESCE(p_unmapped_total, 0)::NUMERIC / p_total_deals::NUMERIC)) * 100 * 0.2;
  ELSE
    mapping_score := 100 * 0.2;
  END IF;
  
  -- Sync freshness (10% weight) - normalized to 24 hours
  freshness_score := GREATEST(0, (1 - (COALESCE(p_hours_since_last_sync, 0) / 24.0)) * 100) * 0.1;
  
  -- Error rate (10% weight)
  IF p_total_syncs_24h > 0 THEN
    error_score := GREATEST(0, (1 - (COALESCE(p_failed_count_24h, 0)::NUMERIC / p_total_syncs_24h::NUMERIC)) * 100) * 0.1;
  ELSE
    error_score := 100 * 0.1;
  END IF;
  
  -- Calculate total
  total_health_score := sync_score + api_score + mapping_score + freshness_score + error_score;
  
  RETURN jsonb_build_object(
    'total_score', ROUND(total_health_score, 2),
    'breakdown', jsonb_build_object(
      'sync_success', ROUND(sync_score / 0.4, 2),
      'api_responsiveness', ROUND(api_score / 0.2, 2),
      'data_completeness', ROUND(mapping_score / 0.2, 2),
      'sync_freshness', ROUND(freshness_score / 0.1, 2),
      'error_rate', ROUND(error_score / 0.1, 2)
    )
  );
END;
$$;

-- Create generate_alert function
CREATE OR REPLACE FUNCTION public.generate_alert(
  p_alert_type TEXT,
  p_severity TEXT,
  p_title TEXT,
  p_message TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_alert_id UUID;
  v_config_enabled BOOLEAN;
  v_duplicate_count INTEGER;
BEGIN
  -- Check if alert type is enabled
  SELECT enabled INTO v_config_enabled
  FROM control_tower_alert_config
  WHERE alert_type = p_alert_type;
  
  IF NOT COALESCE(v_config_enabled, true) THEN
    RETURN NULL;
  END IF;
  
  -- Check for duplicate active alerts (same type within last hour)
  SELECT COUNT(*) INTO v_duplicate_count
  FROM control_tower_alerts
  WHERE alert_type = p_alert_type
    AND status = 'active'
    AND triggered_at > now() - INTERVAL '1 hour';
  
  IF v_duplicate_count > 0 THEN
    RETURN NULL; -- Avoid duplicate alerts
  END IF;
  
  -- Create alert
  INSERT INTO control_tower_alerts (
    alert_type, severity, title, message, metadata, entity_type, entity_id
  ) VALUES (
    p_alert_type, p_severity, p_title, p_message, p_metadata, p_entity_type, p_entity_id
  )
  RETURNING id INTO v_alert_id;
  
  RETURN v_alert_id;
END;
$$;

-- Create auto_resolve_alerts function
CREATE OR REPLACE FUNCTION public.auto_resolve_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Auto-resolve alerts older than configured hours when conditions normalized
  UPDATE control_tower_alerts a
  SET
    status = 'resolved',
    resolved_at = now(),
    resolution_notes = 'Auto-resolved: conditions normalized'
  FROM control_tower_alert_config c
  WHERE a.alert_type = c.alert_type
    AND a.status = 'active'
    AND a.triggered_at < now() - (c.auto_resolve_after_hours || ' hours')::INTERVAL;
END;
$$;

-- Enable RLS on new tables
ALTER TABLE public.control_tower_health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.control_tower_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.control_tower_alert_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for health_snapshots
CREATE POLICY "Admins and managers can view health snapshots"
  ON public.control_tower_health_snapshots
  FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin') OR 
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager')
  );

CREATE POLICY "System can insert health snapshots"
  ON public.control_tower_health_snapshots
  FOR INSERT
  WITH CHECK (true);

-- RLS Policies for alerts
CREATE POLICY "All authenticated users can view active alerts"
  ON public.control_tower_alerts
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage alerts"
  ON public.control_tower_alerts
  FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin') OR 
    has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can acknowledge alerts"
  ON public.control_tower_alerts
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (
    status IN ('acknowledged', 'resolved') AND
    (acknowledged_by = auth.uid() OR resolved_by = auth.uid())
  );

-- RLS Policies for alert_config
CREATE POLICY "All authenticated users can view alert config"
  ON public.control_tower_alert_config
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage alert config"
  ON public.control_tower_alert_config
  FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin') OR 
    has_role(auth.uid(), 'admin')
  );
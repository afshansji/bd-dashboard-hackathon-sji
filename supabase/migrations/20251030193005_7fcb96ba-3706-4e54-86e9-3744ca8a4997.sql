-- Add helper functions for sync health checks

-- Function to get unmapped deal owners
CREATE OR REPLACE FUNCTION get_unmapped_deal_owners()
RETURNS TABLE (
  deal_id uuid,
  deal_title text,
  control_tower_owner_id text
) 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, title, control_tower_owner_id::text
  FROM deals
  WHERE synced_from_control_tower = true
    AND control_tower_owner_id IS NOT NULL
    AND owner_id IS NULL
  LIMIT 50;
$$;

-- Function to get comprehensive sync health summary
CREATE OR REPLACE FUNCTION get_sync_health_summary()
RETURNS jsonb 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'unmapped_owners', (
      SELECT COUNT(*) FROM deals 
      WHERE synced_from_control_tower = true 
        AND control_tower_owner_id IS NOT NULL 
        AND owner_id IS NULL
    ),
    'unmapped_pms', (
      SELECT COUNT(*) FROM deals 
      WHERE synced_from_control_tower = true 
        AND pm_control_tower_id IS NOT NULL 
        AND pm_assigned_id IS NULL
    ),
    'unmapped_pods', (
      SELECT COUNT(*) FROM deals 
      WHERE synced_from_control_tower = true 
        AND pod_id IS NULL
    ),
    'failed_pushes_7d', (
      SELECT COUNT(*) FROM control_tower_sync_log 
      WHERE sync_type = 'push' 
        AND status = 'failed' 
        AND synced_at > NOW() - INTERVAL '7 days'
    ),
    'employee_last_sync', (
      SELECT MAX(last_synced_at) FROM employees 
      WHERE synced_from_control_tower = true
    ),
    'pod_last_sync', (
      SELECT MAX(updated_at) FROM pods
    ),
    'deal_last_sync', (
      SELECT MAX(last_synced_at) FROM deals 
      WHERE synced_from_control_tower = true
    ),
    'total_employees', (SELECT COUNT(*) FROM employees WHERE synced_from_control_tower = true),
    'total_pods', (SELECT COUNT(*) FROM pods),
    'total_clients', (SELECT COUNT(*) FROM clients),
    'total_deals', (SELECT COUNT(*) FROM deals WHERE synced_from_control_tower = true)
  );
$$;
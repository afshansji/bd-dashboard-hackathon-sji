-- Add DELETE policy for admins on control_tower_sync_log
CREATE POLICY "Admins can delete sync logs"
ON control_tower_sync_log
FOR DELETE
USING (
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'admin')
);

-- Function to clear all sync logs (admin only)
CREATE OR REPLACE FUNCTION public.clear_all_sync_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if user has admin role
  IF NOT (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Only administrators can clear sync logs';
  END IF;
  
  DELETE FROM control_tower_sync_log;
END;
$$;
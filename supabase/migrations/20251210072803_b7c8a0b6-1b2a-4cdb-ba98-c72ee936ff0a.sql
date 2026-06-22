-- Create sql_query_logs table for admin SQL executor
CREATE TABLE IF NOT EXISTS public.sql_query_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  query_text TEXT NOT NULL,
  query_type TEXT NOT NULL,
  execution_status TEXT NOT NULL,
  error_message TEXT,
  rows_affected INTEGER,
  execution_time_ms INTEGER,
  result_preview JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sql_query_logs_user_id ON sql_query_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sql_query_logs_created_at ON sql_query_logs(created_at DESC);

-- Enable RLS
ALTER TABLE sql_query_logs ENABLE ROW LEVEL SECURITY;

-- Only super_admin can view logs
CREATE POLICY "Super admins can view sql query logs"
  ON sql_query_logs FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'));

-- System can insert logs
CREATE POLICY "System can insert sql query logs"
  ON sql_query_logs FOR INSERT
  WITH CHECK (true);

-- Create execute_raw_sql function for admin queries
CREATE OR REPLACE FUNCTION public.execute_raw_sql(query_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  EXECUTE query_text INTO result;
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;
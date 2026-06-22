-- Create SQL Query Logs table to track all queries executed via admin interface
CREATE TABLE IF NOT EXISTS public.sql_query_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    user_name TEXT,
    query_text TEXT NOT NULL,
    query_type TEXT NOT NULL, -- SELECT, INSERT, UPDATE, DELETE, etc.
    execution_status TEXT NOT NULL DEFAULT 'pending', -- pending, success, error
    error_message TEXT,
    rows_affected INTEGER,
    execution_time_ms INTEGER,
    result_preview JSONB, -- Store first few rows of results for SELECT queries
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_sql_query_logs_user_id ON public.sql_query_logs(user_id);

-- Create index for faster lookups by status
CREATE INDEX IF NOT EXISTS idx_sql_query_logs_status ON public.sql_query_logs(execution_status);

-- Create index for time-based queries
CREATE INDEX IF NOT EXISTS idx_sql_query_logs_created_at ON public.sql_query_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.sql_query_logs ENABLE ROW LEVEL SECURITY;

-- Only super_admin can view query logs
CREATE POLICY "Super admins can view all query logs"
ON public.sql_query_logs FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'super_admin'
    )
);

-- Only super_admin can insert query logs (via edge function with service role)
CREATE POLICY "Super admins can insert query logs"
ON public.sql_query_logs FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'super_admin'
    )
);

-- Add comment for documentation
COMMENT ON TABLE public.sql_query_logs IS 'Audit log for SQL queries executed through the admin interface';
COMMENT ON COLUMN public.sql_query_logs.query_text IS 'The full SQL query that was executed';
COMMENT ON COLUMN public.sql_query_logs.query_type IS 'Type of SQL operation: SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, etc.';
COMMENT ON COLUMN public.sql_query_logs.result_preview IS 'Preview of first 100 rows for SELECT queries';

-- Create function to execute raw SQL queries (requires service role)
-- This function is called by the edge function with elevated privileges
CREATE OR REPLACE FUNCTION public.execute_raw_sql(query_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
    query_type TEXT;
    affected_count INTEGER;
BEGIN
    -- Determine query type
    query_type := UPPER(TRIM(SPLIT_PART(query_text, ' ', 1)));

    -- Execute based on query type
    IF query_type IN ('SELECT', 'WITH', 'EXPLAIN') THEN
        -- For SELECT queries, return the result as JSON
        EXECUTE 'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (' || query_text || ') t'
        INTO result;
        RETURN result;
    ELSE
        -- For INSERT/UPDATE/DELETE/DDL, execute and return affected rows
        EXECUTE query_text;
        GET DIAGNOSTICS affected_count = ROW_COUNT;
        RETURN jsonb_build_object('affected_rows', affected_count, 'success', true);
    END IF;

EXCEPTION WHEN OTHERS THEN
    -- Return error details
    RAISE;
END;
$$;

-- Revoke execute from public, only service role should call this
REVOKE EXECUTE ON FUNCTION public.execute_raw_sql(TEXT) FROM PUBLIC;

COMMENT ON FUNCTION public.execute_raw_sql IS 'Executes raw SQL queries. Only accessible via service role from edge functions.';

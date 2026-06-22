-- Drop and recreate execute_raw_sql function to handle all query types
DROP FUNCTION IF EXISTS public.execute_raw_sql(text);

CREATE OR REPLACE FUNCTION public.execute_raw_sql(query_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  affected_rows INTEGER;
BEGIN
  -- For SELECT queries, return results as JSON array
  IF UPPER(TRIM(query_text)) LIKE 'SELECT%' OR 
     UPPER(TRIM(query_text)) LIKE 'WITH%' OR
     UPPER(TRIM(query_text)) LIKE 'EXPLAIN%' THEN
    EXECUTE 'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (' || query_text || ') t' INTO result;
    RETURN result;
  ELSE
    -- For INSERT/UPDATE/DELETE, execute and return affected rows
    EXECUTE query_text;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN jsonb_build_object('affected_rows', affected_rows, 'success', true);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log("Admin SQL Executor function up and running!")

interface ExecuteQueryRequest {
  query: string;
}

interface QueryLogEntry {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  query_text: string;
  query_type: string;
  execution_status: string;
  error_message: string | null;
  rows_affected: number | null;
  execution_time_ms: number | null;
  result_preview: unknown | null;
  created_at: string;
}

// List of dangerous operations that should be blocked
const BLOCKED_OPERATIONS = [
  'DROP DATABASE',
  'DROP SCHEMA',
  'TRUNCATE',
  'DROP TABLE users',
  'DROP TABLE user_roles',
  'DROP TABLE profiles',
  'DELETE FROM users',
  'DELETE FROM user_roles',
  'DELETE FROM profiles',
  'DELETE FROM auth.',
  'DROP TABLE sql_query_logs',
  'TRUNCATE sql_query_logs',
  'DELETE FROM sql_query_logs',
  'ALTER TABLE sql_query_logs',
];

// Determine the query type from the SQL statement
function getQueryType(query: string): string {
  const normalizedQuery = query.trim().toUpperCase();

  if (normalizedQuery.startsWith('SELECT')) return 'SELECT';
  if (normalizedQuery.startsWith('INSERT')) return 'INSERT';
  if (normalizedQuery.startsWith('UPDATE')) return 'UPDATE';
  if (normalizedQuery.startsWith('DELETE')) return 'DELETE';
  if (normalizedQuery.startsWith('CREATE')) return 'CREATE';
  if (normalizedQuery.startsWith('ALTER')) return 'ALTER';
  if (normalizedQuery.startsWith('DROP')) return 'DROP';
  if (normalizedQuery.startsWith('TRUNCATE')) return 'TRUNCATE';
  if (normalizedQuery.startsWith('WITH')) return 'CTE';
  if (normalizedQuery.startsWith('EXPLAIN')) return 'EXPLAIN';

  return 'OTHER';
}

// Check if query contains blocked operations
function isBlockedQuery(query: string): { blocked: boolean; reason?: string } {
  const normalizedQuery = query.toUpperCase().replace(/\s+/g, ' ');

  for (const blocked of BLOCKED_OPERATIONS) {
    if (normalizedQuery.includes(blocked.toUpperCase())) {
      return { blocked: true, reason: `Operation "${blocked}" is not allowed for safety reasons` };
    }
  }

  return { blocked: false };
}

// Get user's role from user_roles table
// deno-lint-ignore no-explicit-any
const getUserRole = async (client: any, userId: string): Promise<string | null> => {
  const { data, error } = await client
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user role:', error);
    return null;
  }

  return (data as { role: string } | null)?.role || null;
};

// Get user details
// deno-lint-ignore no-explicit-any
const getUserDetails = async (client: any, userId: string): Promise<{ email: string; name: string | null }> => {
  const { data, error } = await client
    .from('users')
    .select('email, first_name, last_name')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return { email: 'unknown', name: null };
  }

  const userData = data as { email: string; first_name?: string; last_name?: string };
  const name = [userData.first_name, userData.last_name].filter(Boolean).join(' ') || null;
  return { email: userData.email, name };
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      )
    }

    // Verify the requesting user is authenticated
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      )
    }

    // Check if user has super_admin privileges (only super_admin can execute SQL)
    const userRole = await getUserRole(supabaseAdmin, user.id);

    if (userRole !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Insufficient privileges. Only Super Admins can execute SQL queries.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403
        }
      )
    }

    const url = new URL(req.url)
    const { method } = req

    // GET: Fetch query logs
    if (method === 'GET') {
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = (page - 1) * limit;

      const { data: logs, error: logsError, count } = await supabaseAdmin
        .from('sql_query_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (logsError) {
        return new Response(
          JSON.stringify({ error: `Failed to fetch logs: ${logsError.message}` }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
      }

      return new Response(
        JSON.stringify({
          logs: logs || [],
          total: count || 0,
          page,
          limit
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // POST: Execute SQL query
    if (method === 'POST') {
      const { query } = await req.json() as ExecuteQueryRequest;

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: 'Query is required' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
      }

      const trimmedQuery = query.trim();
      const queryType = getQueryType(trimmedQuery);

      // Check for blocked operations
      const blockCheck = isBlockedQuery(trimmedQuery);
      if (blockCheck.blocked) {
        return new Response(
          JSON.stringify({ error: blockCheck.reason }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403
          }
        )
      }

      // Get user details for logging
      const userDetails = await getUserDetails(supabaseAdmin, user.id);

      // Start timing
      const startTime = Date.now();

      let executionStatus = 'success';
      let errorMessage: string | null = null;
      let rowsAffected: number | null = null;
      let resultPreview: unknown = null;
      let queryResult: unknown = null;

      try {
        // Execute the query using Postgres function
        // For SELECT queries, we use a raw query approach
        const { data, error } = await supabaseAdmin.rpc('execute_raw_sql', {
          query_text: trimmedQuery
        });

        if (error) {
          throw error;
        }

        queryResult = data;

        // Handle different query types
        if (queryType === 'SELECT' || queryType === 'CTE' || queryType === 'EXPLAIN') {
          if (Array.isArray(data)) {
            rowsAffected = data.length;
            // Store preview of first 100 rows
            resultPreview = data.slice(0, 100);
          }
        } else {
          // For INSERT/UPDATE/DELETE, try to get affected rows
          if (data && typeof data === 'object' && 'affected_rows' in data) {
            rowsAffected = data.affected_rows as number;
          } else if (Array.isArray(data)) {
            rowsAffected = data.length;
          }
        }
      } catch (execError: unknown) {
        executionStatus = 'error';
        errorMessage = execError instanceof Error ? execError.message : 'Unknown error occurred';
        console.error('Query execution error:', execError);
      }

      const executionTimeMs = Date.now() - startTime;

      // Log the query execution
      const { data: logEntry, error: logError } = await supabaseAdmin
        .from('sql_query_logs')
        .insert({
          user_id: user.id,
          user_email: userDetails.email,
          user_name: userDetails.name,
          query_text: trimmedQuery,
          query_type: queryType,
          execution_status: executionStatus,
          error_message: errorMessage,
          rows_affected: rowsAffected,
          execution_time_ms: executionTimeMs,
          result_preview: resultPreview,
        })
        .select()
        .single();

      if (logError) {
        console.error('Failed to log query:', logError);
      }

      // Return response
      if (executionStatus === 'error') {
        return new Response(
          JSON.stringify({
            error: errorMessage,
            log_id: logEntry?.id,
            execution_time_ms: executionTimeMs,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          query_type: queryType,
          rows_affected: rowsAffected,
          execution_time_ms: executionTimeMs,
          result: queryResult,
          log_id: logEntry?.id,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

import axiosPrivate from "@/lib/axiosPrivate";

export interface SqlQueryLog {
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
  updated_at: string;
}

export interface ExecuteQueryRequest {
  query: string;
}

export interface ExecuteQueryResponse {
  success: boolean;
  query_type: string;
  rows_affected: number | null;
  execution_time_ms: number;
  result: unknown;
  log_id: string;
}

export interface ExecuteQueryErrorResponse {
  error: string;
  log_id?: string;
  execution_time_ms?: number;
}

export interface QueryLogsResponse {
  logs: SqlQueryLog[];
  total: number;
  page: number;
  limit: number;
}

export interface QueryLogsParams {
  page?: number;
  limit?: number;
}

/**
 * Execute a SQL query via the admin-sql-executor edge function
 */
export async function executeQuery(query: string): Promise<ExecuteQueryResponse> {
  const response = await axiosPrivate.post<ExecuteQueryResponse>(
    "admin-sql-executor",
    { query }
  );
  return response.data;
}

/**
 * Fetch query execution logs with pagination
 */
export async function fetchQueryLogs(params: QueryLogsParams = {}): Promise<QueryLogsResponse> {
  const { page = 1, limit = 50 } = params;
  const response = await axiosPrivate.get<QueryLogsResponse>(
    "admin-sql-executor",
    { params: { page, limit } }
  );
  return response.data;
}

/**
 * Determine if query is a read-only SELECT query
 */
export function isSelectQuery(query: string): boolean {
  const trimmed = query.trim().toUpperCase();
  return trimmed.startsWith('SELECT') ||
         trimmed.startsWith('WITH') ||
         trimmed.startsWith('EXPLAIN');
}

/**
 * Get a user-friendly description of the query type
 */
export function getQueryTypeLabel(queryType: string): string {
  const labels: Record<string, string> = {
    'SELECT': 'Query',
    'INSERT': 'Insert',
    'UPDATE': 'Update',
    'DELETE': 'Delete',
    'CREATE': 'Create',
    'ALTER': 'Alter',
    'DROP': 'Drop',
    'TRUNCATE': 'Truncate',
    'CTE': 'Query (CTE)',
    'EXPLAIN': 'Explain',
    'OTHER': 'Other',
  };
  return labels[queryType] || queryType;
}

/**
 * Get status badge variant based on execution status
 */
export function getStatusVariant(status: string): 'default' | 'destructive' | 'secondary' {
  switch (status) {
    case 'success':
      return 'default';
    case 'error':
      return 'destructive';
    default:
      return 'secondary';
  }
}

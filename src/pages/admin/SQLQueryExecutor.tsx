import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  History,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Copy,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Terminal,
  Table as TableIcon
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  executeQuery,
  fetchQueryLogs,
  isSelectQuery,
  getQueryTypeLabel,
  getStatusVariant,
  type SqlQueryLog,
  type ExecuteQueryResponse,
} from '@/Api/sqlExecutor';

const SQLQueryExecutor = () => {
  const [query, setQuery] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<ExecuteQueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<SqlQueryLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();

  // Load query logs
  const loadLogs = useCallback(async (page = 1) => {
    setLogsLoading(true);
    try {
      const response = await fetchQueryLogs({ page, limit: 20 });
      setLogs(response.logs);
      setLogsTotal(response.total);
      setLogsPage(page);
    } catch (err) {
      console.error('Failed to load query logs:', err);
      toast({
        title: 'Failed to load logs',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLogsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Show confirmation dialog before executing
  const handleExecuteClick = () => {
    if (!query.trim()) {
      toast({
        title: 'Query required',
        description: 'Please enter a SQL query to execute',
        variant: 'destructive',
      });
      return;
    }
    setShowConfirmDialog(true);
  };

  // Execute query after confirmation
  const handleConfirmExecute = async () => {
    setShowConfirmDialog(false);
    setIsExecuting(true);
    setResult(null);
    setError(null);

    try {
      const response = await executeQuery(query);
      setResult(response);
      toast({
        title: 'Query executed successfully',
        description: `${response.query_type} completed in ${response.execution_time_ms}ms`,
      });
      // Refresh logs after successful execution
      loadLogs();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Query execution failed';
      setError(errorMessage);
      toast({
        title: 'Query failed',
        description: errorMessage,
        variant: 'destructive',
      });
      // Still refresh logs to show the failed query
      loadLogs();
    } finally {
      setIsExecuting(false);
    }
  };

  // Copy query to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Query copied to clipboard',
    });
  };

  // Load query from log into editor
  const loadQueryFromLog = (queryText: string) => {
    setQuery(queryText);
    toast({
      title: 'Query loaded',
      description: 'Query has been loaded into the editor',
    });
  };

  // Render result table for SELECT queries
  const renderResultTable = (data: unknown) => {
    if (!Array.isArray(data) || data.length === 0) {
      return (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          No results returned
        </div>
      );
    }

    const columns = Object.keys(data[0]);

    return (
      <ScrollArea className="w-full whitespace-nowrap">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              {columns.map((col) => (
                <TableHead key={col} className="min-w-[120px]">
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(0, 100).map((row: Record<string, unknown>, index: number) => (
              <TableRow key={index}>
                <TableCell className="text-center text-muted-foreground">
                  {index + 1}
                </TableCell>
                {columns.map((col) => (
                  <TableCell key={col} className="max-w-[300px] truncate">
                    {formatCellValue(row[col])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );
  };

  // Format cell value for display
  const formatCellValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">SQL Query Executor</h1>
          <p className="text-muted-foreground">
            Execute SQL queries directly on the database (Super Admin only)
          </p>
        </div>
      </div>

      {/* Warning Alert */}
      <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Caution: Direct Database Access</AlertTitle>
        <AlertDescription>
          This tool provides direct access to the production database. All queries are logged and audited.
          Use with extreme care - incorrect queries can cause data loss or corruption.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="execute" className="space-y-4">
        <TabsList>
          <TabsTrigger value="execute" className="flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            Execute Query
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Query History
            {logsTotal > 0 && (
              <Badge variant="secondary" className="ml-1">
                {logsTotal}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Execute Query Tab */}
        <TabsContent value="execute" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5" />
                SQL Editor
              </CardTitle>
              <CardDescription>
                Enter your SQL query below. SELECT, INSERT, UPDATE, DELETE, and DDL statements are supported.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="SELECT * FROM users LIMIT 10;"
                className="font-mono text-sm min-h-[200px] resize-y"
                disabled={isExecuting}
              />
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {isSelectQuery(query) ? (
                    <span className="flex items-center gap-1">
                      <TableIcon className="h-4 w-4" />
                      Read-only query
                    </span>
                  ) : query.trim() ? (
                    <span className="flex items-center gap-1 text-amber-600">
                      <AlertTriangle className="h-4 w-4" />
                      This query may modify data
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuery('')}
                    disabled={isExecuting || !query}
                  >
                    Clear
                  </Button>
                  <Button
                    onClick={handleExecuteClick}
                    disabled={isExecuting || !query.trim()}
                    className="min-w-[120px]"
                  >
                    {isExecuting ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Execute
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Section */}
          {(result || error) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  {error ? (
                    <>
                      <XCircle className="h-5 w-5 text-destructive" />
                      <span className="text-destructive">Query Failed</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Query Results
                    </>
                  )}
                </CardTitle>
                {result && (
                  <CardDescription className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Badge variant="outline">{result.query_type}</Badge>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {result.execution_time_ms}ms
                    </span>
                    {result.rows_affected !== null && (
                      <span>
                        {result.rows_affected} row{result.rows_affected !== 1 ? 's' : ''} affected
                      </span>
                    )}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {error ? (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription className="font-mono text-sm whitespace-pre-wrap">
                      {error}
                    </AlertDescription>
                  </Alert>
                ) : result ? (
                  <div className="border rounded-md overflow-hidden">
                    {isSelectQuery(query) ? (
                      renderResultTable(result.result)
                    ) : (
                      <div className="p-4 bg-muted/50">
                        <pre className="text-sm font-mono whitespace-pre-wrap">
                          {JSON.stringify(result.result, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Query History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Query Execution History
                  </CardTitle>
                  <CardDescription>
                    All queries executed through this interface are logged for audit purposes
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadLogs(logsPage)}
                  disabled={logsLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${logsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mb-4 opacity-50" />
                  <p>No queries have been executed yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <Collapsible
                      key={log.id}
                      open={expandedLogId === log.id}
                      onOpenChange={(open) => setExpandedLogId(open ? log.id : null)}
                    >
                      <Card className="border">
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {log.execution_status === 'success' ? (
                                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                                )}
                                <Badge variant={getStatusVariant(log.execution_status)}>
                                  {getQueryTypeLabel(log.query_type)}
                                </Badge>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-mono text-sm truncate">
                                  {log.query_text.substring(0, 80)}
                                  {log.query_text.length > 80 ? '...' : ''}
                                </p>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-shrink-0">
                                <span className="hidden md:inline">{log.user_name || log.user_email}</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {log.execution_time_ms}ms
                                </span>
                                <span className="hidden sm:inline">
                                  {formatTimestamp(log.created_at)}
                                </span>
                              </div>
                            </div>
                            {expandedLogId === log.id ? (
                              <ChevronUp className="h-4 w-4 ml-2 flex-shrink-0" />
                            ) : (
                              <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0" />
                            )}
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="border-t p-4 space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Executed by:</span>
                                <p className="font-medium">{log.user_name || 'N/A'}</p>
                                <p className="text-xs text-muted-foreground">{log.user_email}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Status:</span>
                                <p className="font-medium capitalize">{log.execution_status}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Rows Affected:</span>
                                <p className="font-medium">{log.rows_affected ?? 'N/A'}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Execution Time:</span>
                                <p className="font-medium">{log.execution_time_ms}ms</p>
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted-foreground">Query:</span>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(log.query_text)}
                                  >
                                    <Copy className="h-4 w-4 mr-1" />
                                    Copy
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => loadQueryFromLog(log.query_text)}
                                  >
                                    <Terminal className="h-4 w-4 mr-1" />
                                    Load
                                  </Button>
                                </div>
                              </div>
                              <pre className="bg-muted/50 p-3 rounded-md text-sm font-mono whitespace-pre-wrap overflow-x-auto">
                                {log.query_text}
                              </pre>
                            </div>

                            {log.error_message && (
                              <Alert variant="destructive">
                                <XCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription className="font-mono text-sm">
                                  {log.error_message}
                                </AlertDescription>
                              </Alert>
                            )}

                            {log.result_preview && Array.isArray(log.result_preview) && log.result_preview.length > 0 && (
                              <div>
                                <span className="text-sm text-muted-foreground mb-2 block">
                                  Result Preview ({log.result_preview.length} rows):
                                </span>
                                <div className="border rounded-md overflow-hidden max-h-[300px] overflow-y-auto">
                                  {renderResultTable(log.result_preview)}
                                </div>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  ))}

                  {/* Pagination */}
                  {logsTotal > 20 && (
                    <div className="flex items-center justify-center gap-2 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadLogs(logsPage - 1)}
                        disabled={logsPage === 1 || logsLoading}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {logsPage} of {Math.ceil(logsTotal / 20)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadLogs(logsPage + 1)}
                        disabled={logsPage >= Math.ceil(logsTotal / 20) || logsLoading}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Query Execution
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  You are about to execute a SQL query directly on the database.
                  {!isSelectQuery(query) && (
                    <span className="block text-amber-600 font-medium mt-1">
                      This query may modify data.
                    </span>
                  )}
                </p>
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Query to execute:</p>
                  <pre className="text-sm font-mono whitespace-pre-wrap max-h-[150px] overflow-y-auto">
                    {query.length > 300 ? query.substring(0, 300) + '...' : query}
                  </pre>
                </div>
                <p className="text-sm">
                  Are you sure you want to proceed?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmExecute}
              className={!isSelectQuery(query) ? 'bg-amber-600 hover:bg-amber-700' : ''}
            >
              <Play className="mr-2 h-4 w-4" />
              Execute Query
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SQLQueryExecutor;

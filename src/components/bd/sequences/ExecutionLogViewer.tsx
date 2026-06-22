import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Activity } from "lucide-react";
import { ExecutionLogFilters } from "./ExecutionLogFilters";
import { ExecutionLogTable } from "./ExecutionLogTable";
import { useSequenceExecutionLogsAdvanced, type LogFilters } from "@/hooks/useSequenceExecutionLogsAdvanced";

interface ExecutionLogViewerProps {
  onSwitchToLive?: () => void;
}

export function ExecutionLogViewer({ onSwitchToLive }: ExecutionLogViewerProps) {
  const [filters, setFilters] = useState<LogFilters>({
    page: 1,
    pageSize: 50,
    sortBy: 'executed_at',
    sortOrder: 'desc',
  });

  const { data, isLoading, refetch } = useSequenceExecutionLogsAdvanced(filters);
  const logs = data?.logs || [];
  const totalCount = data?.totalCount || 0;

  const successCount = logs.filter(l => l.status === 'success').length;
  const failedCount = logs.filter(l => l.status === 'failed').length;
  const successRate = totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Execution Log History</CardTitle>
              <CardDescription>
                Showing {totalCount.toLocaleString()} logs
                {failedCount > 0 && ` (${failedCount} failed, ${successRate}% success rate)`}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {onSwitchToLive && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSwitchToLive}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  View Live Stream
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ExecutionLogFilters filters={filters} onFilterChange={setFilters} />
        </CardContent>
      </Card>

      <ExecutionLogTable
        logs={logs}
        totalCount={totalCount}
        filters={filters}
        onFilterChange={setFilters}
        isLoading={isLoading}
      />
    </div>
  );
}

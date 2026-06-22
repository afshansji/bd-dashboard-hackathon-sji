import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Mail,
  Linkedin,
  Phone,
  Copy,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { format } from "date-fns";
import type { ExecutionLogWithDetails, LogFilters } from "@/hooks/useSequenceExecutionLogsAdvanced";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface ExecutionLogTableProps {
  logs: ExecutionLogWithDetails[];
  totalCount: number;
  filters: LogFilters;
  onFilterChange: (filters: LogFilters) => void;
  isLoading?: boolean;
}

const CHANNEL_ICONS = {
  email: Mail,
  linkedin: Linkedin,
  phone: Phone,
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  success: "default",
  pending: "secondary",
  failed: "destructive",
  skipped: "outline",
};

export function ExecutionLogTable({
  logs,
  totalCount,
  filters,
  onFilterChange,
  isLoading,
}: ExecutionLogTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const page = filters.page || 1;
  const pageSize = filters.pageSize || 50;
  const totalPages = Math.ceil(totalCount / pageSize);

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleSort = (column: 'executed_at' | 'status' | 'contact_name') => {
    const newSortOrder = filters.sortBy === column && filters.sortOrder === 'desc' ? 'asc' : 'desc';
    onFilterChange({
      ...filters,
      sortBy: column,
      sortOrder: newSortOrder,
    });
  };

  const handlePageChange = (newPage: number) => {
    onFilterChange({ ...filters, page: newPage });
  };

  const handlePageSizeChange = (newPageSize: string) => {
    onFilterChange({ ...filters, pageSize: parseInt(newPageSize), page: 1 });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">No execution logs found matching your filters.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('executed_at')}
                >
                  <div className="flex items-center gap-1">
                    Timestamp
                    {filters.sortBy === 'executed_at' && (
                      filters.sortOrder === 'desc' ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Sequence</TableHead>
                <TableHead>Step</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Status
                    {filters.sortBy === 'status' && (
                      filters.sortOrder === 'desc' ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const isExpanded = expandedRows.has(log.id);
                const ChannelIcon = CHANNEL_ICONS[log.step.channel as keyof typeof CHANNEL_ICONS] || Mail;
                const contactName = `${log.enrollment.contact.first_name} ${log.enrollment.contact.last_name}`;

                return (
                  <>
                    <TableRow
                      key={log.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleRow(log.id)}
                    >
                      <TableCell>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronUp className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {format(new Date(log.executed_at), 'MMM dd, HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{contactName}</div>
                          <div className="text-xs text-muted-foreground">{log.enrollment.contact.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{log.sequence.name}</TableCell>
                      <TableCell>Step {log.step.step_order}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ChannelIcon className="h-4 w-4" />
                          <span className="capitalize">{log.step.channel}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[log.status] || "outline"}>
                          {log.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-muted/30">
                          <div className="p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-semibold mb-2">Contact Details</h4>
                                <div className="space-y-1 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Name:</span> {contactName}
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Email:</span> {log.enrollment.contact.email}
                                  </div>
                                  {log.enrollment.contact.company && (
                                    <div>
                                      <span className="text-muted-foreground">Company:</span> {log.enrollment.contact.company}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div>
                                <h4 className="font-semibold mb-2">Execution Details</h4>
                                <div className="space-y-1 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Status:</span>{" "}
                                    <Badge variant={STATUS_VARIANTS[log.status] || "outline"} className="ml-1">
                                      {log.status}
                                    </Badge>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Executed:</span>{" "}
                                    {format(new Date(log.executed_at), 'PPpp')}
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Channel:</span>{" "}
                                    <span className="capitalize">{log.step.channel}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {log.error_message && (
                              <div>
                                <h4 className="font-semibold mb-2 text-destructive">Error Message</h4>
                                <div className="bg-background p-3 rounded-md border border-destructive/20">
                                  <code className="text-sm text-destructive">{log.error_message}</code>
                                </div>
                              </div>
                            )}

                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <div>
                                <h4 className="font-semibold mb-2">Metadata</h4>
                                <div className="bg-background p-3 rounded-md border">
                                  <pre className="text-xs overflow-x-auto">
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}

                            <div className="flex gap-2 pt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(JSON.stringify(log, null, 2))}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Details
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t p-4">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} logs
            </p>
            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={page === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              disabled={page === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

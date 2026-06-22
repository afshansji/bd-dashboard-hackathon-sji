import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useImportHistory, useImportStats, ImportJob } from "@/hooks/useImportHistory";
import { format } from "date-fns";
import { CheckCircle, XCircle, Clock, Search, Filter, Eye, MoreVertical, Download, FileSpreadsheet, Database, Undo2 } from "lucide-react";
import { ImportDetailModal } from "@/components/bd/ImportDetailModal";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

export default function CampaignImportHistory() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [selectedImport, setSelectedImport] = useState<ImportJob | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const { data: imports, isLoading } = useImportHistory({
    status: statusFilter !== "all" ? statusFilter : undefined,
    source: sourceFilter !== "all" ? sourceFilter : undefined,
  });

  const { data: stats } = useImportStats();

  const filteredImports = imports?.filter((job) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      job.bd_campaigns?.name.toLowerCase().includes(searchLower) ||
      job.id.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/10 text-green-700 dark:text-green-400"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case "running":
        return <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400"><Clock className="h-3 w-3 mr-1" />Running</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "exa":
        return <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-400"><Database className="h-3 w-3 mr-1" />EXA</Badge>;
      case "google_sheets":
        return <Badge className="bg-green-500/10 text-green-700 dark:text-green-400"><FileSpreadsheet className="h-3 w-3 mr-1" />Sheets</Badge>;
      default:
        return <Badge variant="outline">{source}</Badge>;
    }
  };

  const handleViewDetails = (job: ImportJob) => {
    setSelectedImport(job);
    setDetailModalOpen(true);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Outreach Import History</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all campaign contact imports
          </p>
        </div>

        {/* Summary Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Total Imports</p>
              <p className="text-2xl font-bold mt-1">{stats.totalImports}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Success Rate</p>
              <p className="text-2xl font-bold mt-1">{stats.successRate}%</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Contacts Added</p>
              <p className="text-2xl font-bold mt-1">{stats.totalContactsAdded}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Successful</p>
              <p className="text-2xl font-bold mt-1">{stats.successfulImports}</p>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by campaign or import ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="running">Running</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="exa">Exa</SelectItem>
                <SelectItem value="google_sheets">Google Sheets</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Import Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Statistics</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : filteredImports && filteredImports.length > 0 ? (
                filteredImports.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="text-sm">
                      {format(new Date(job.created_at), "MMM dd, yyyy")}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(job.created_at), "HH:mm")}
                      </span>
                    </TableCell>
                    <TableCell>{getSourceBadge(job.import_source)}</TableCell>
                    <TableCell className="font-medium">
                      {job.bd_campaigns?.name}
                      {job.is_rolled_back && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          <Undo2 className="h-3 w-3 mr-1" />
                          Rolled Back
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(job.status)}</TableCell>
                    <TableCell className="text-sm">
                      <div className="flex gap-2">
                        <span className="text-green-600 dark:text-green-400">
                          ✓ {job.rollback_data?.contact_ids?.length || 0}
                        </span>
                        {job.skipped_count > 0 && (
                          <span className="text-yellow-600 dark:text-yellow-400">
                            ⊘ {job.skipped_count}
                          </span>
                        )}
                        {job.failed_count > 0 && (
                          <span className="text-red-600 dark:text-red-400">
                            ✗ {job.failed_count}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(job)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No imports found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        <ImportDetailModal
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          importJob={selectedImport}
        />
      </div>
    </div>
  );
}

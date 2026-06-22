import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  ExternalLink, 
  Download,
  AlertCircle,
  Undo2
} from "lucide-react";
import { ImportJob } from "@/hooks/useImportHistory";
import { format } from "date-fns";
import { useState } from "react";
import { ImportRollbackDialog } from "./ImportRollbackDialog";
import { Link } from "react-router-dom";

interface ImportDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importJob: ImportJob | null;
}

export function ImportDetailModal({ open, onOpenChange, importJob }: ImportDetailModalProps) {
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);

  if (!importJob) return null;

  const imported = importJob.rollback_data?.contact_ids?.length || 0;
  const skipped = importJob.skipped_count || 0;
  const failed = importJob.failed_count || 0;
  const total = imported + skipped + failed;

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
        return <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-400">EXA</Badge>;
      case "google_sheets":
        return <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">SHEETS</Badge>;
      default:
        return <Badge variant="outline">{source}</Badge>;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Import Details</span>
              <div className="flex gap-2">
                {getSourceBadge(importJob.import_source)}
                {getStatusBadge(importJob.status)}
              </div>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-120px)]">
            <div className="space-y-6 pr-4">
              {/* Overview */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Overview</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Import ID:</span>
                    <p className="font-mono text-xs mt-1">{importJob.id}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <p className="mt-1">{format(new Date(importJob.created_at), "PPp")}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Campaign:</span>
                    <p className="mt-1">
                      <Link 
                        to={`/campaigns/${importJob.bd_campaigns?.slug}`}
                        className="text-primary hover:underline"
                      >
                        {importJob.bd_campaigns?.name}
                      </Link>
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Initiated by:</span>
                    <p className="mt-1">{importJob.profiles?.full_name || "Unknown"}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Statistics */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Total Processed</p>
                    <p className="text-2xl font-bold mt-1">{total}</p>
                  </div>
                  <div className="bg-green-500/10 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Imported</p>
                    <p className="text-2xl font-bold mt-1 text-green-700 dark:text-green-400">{imported}</p>
                  </div>
                  <div className="bg-yellow-500/10 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Skipped</p>
                    <p className="text-2xl font-bold mt-1 text-yellow-700 dark:text-yellow-400">{skipped}</p>
                  </div>
                  <div className="bg-red-500/10 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Failed</p>
                    <p className="text-2xl font-bold mt-1 text-red-700 dark:text-red-400">{failed}</p>
                  </div>
                </div>
                {importJob.tags && importJob.tags.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-2">Tags Applied:</p>
                    <div className="flex flex-wrap gap-1">
                      {importJob.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Source Details */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Source Details</h3>
                {importJob.import_source === "google_sheets" && importJob.sheet_url && (
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-muted-foreground">Sheet URL:</span>
                      <a 
                        href={importJob.sheet_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-primary hover:underline mt-1"
                      >
                        View Google Sheet <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    {importJob.field_mapping && (
                      <div>
                        <span className="text-xs text-muted-foreground">Field Mapping:</span>
                        <div className="mt-2 bg-muted/30 rounded p-3 text-xs font-mono">
                          {Object.entries(importJob.field_mapping).map(([key, value]) => (
                            <div key={key} className="flex justify-between py-1">
                              <span className="text-muted-foreground">{key}:</span>
                              <span>{value as string}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {importJob.import_source === "exa" && importJob.criteria && (
                  <div className="bg-muted/30 rounded p-3 text-xs">
                    <pre className="overflow-x-auto">
                      {JSON.stringify(importJob.criteria, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Validation Results */}
              {importJob.validation_results && importJob.validation_results.errors?.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      Validation Errors
                    </h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {importJob.validation_results.errors.map((error: any, idx: number) => (
                        <div key={idx} className="text-xs bg-yellow-500/10 rounded p-2">
                          <span className="font-semibold">Row {error.rowNumber}:</span> {error.message}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Rollback Info */}
              {importJob.is_rolled_back && (
                <>
                  <Separator />
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                      <Undo2 className="h-4 w-4" />
                      Import Rolled Back
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Rolled back on: {importJob.rolled_back_at ? format(new Date(importJob.rolled_back_at), "PPp") : "Unknown"}</p>
                    </div>
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/campaigns/${importJob.bd_campaigns?.slug}`}>
                    View Campaign
                  </Link>
                </Button>
                {!importJob.is_rolled_back && importJob.status === "completed" && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setRollbackDialogOpen(true)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Undo2 className="h-4 w-4 mr-1" />
                    Rollback Import
                  </Button>
                )}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <ImportRollbackDialog
        open={rollbackDialogOpen}
        onOpenChange={setRollbackDialogOpen}
        importJob={importJob}
      />
    </>
  );
}

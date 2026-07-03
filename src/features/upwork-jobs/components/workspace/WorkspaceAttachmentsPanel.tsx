import { useRef } from "react";
import {
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils";
import { useJobLeadAttachments } from "../../hooks/useJobLeadAttachments";

interface WorkspaceAttachmentsPanelProps {
  jobId: string;
  importedAttachments?: unknown[];
}

function fileIcon(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return FileText;
  return FileSpreadsheet;
}

export function WorkspaceAttachmentsPanel({
  jobId,
  importedAttachments = [],
}: WorkspaceAttachmentsPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    attachments,
    isLoading,
    uploadAttachment,
    deleteAttachment,
    openAttachment,
    isUploading,
  } = useJobLeadAttachments(jobId);

  const imported = Array.isArray(importedAttachments) ? importedAttachments : [];

  return (
    <div className="space-y-6" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-tight">Attachments</h3>
          <p className="text-xs text-muted-foreground">
            Upload PDF, Excel, or CSV files — visible to your whole team
          </p>
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.csv,.xls,.xlsx,application/pdf,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              uploadAttachment({ jobId, file });
              event.target.value = "";
            }}
          />
          <Button
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Upload file
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading attachments...</p>
      ) : null}

      {!isLoading && attachments.length === 0 && imported.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <Paperclip className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">No attachments yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Upload a PDF, Excel, or CSV to share with your team
          </p>
        </div>
      ) : null}

      {attachments.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Team uploads
          </p>
          {attachments.map((attachment) => {
            const Icon = fileIcon(attachment.file_name);
            return (
              <div
                key={attachment.id}
                className="flex animate-in fade-in-0 items-center gap-3 rounded-xl border bg-card p-3.5 shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{attachment.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {attachment.uploader_name ? `${attachment.uploader_name} · ` : ""}
                    {formatRelativeTime(attachment.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void openAttachment(attachment)}
                  >
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    Open
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteAttachment(attachment)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {imported.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Imported with lead
          </p>
          {imported.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-lg border p-3 text-sm text-muted-foreground"
            >
              <Paperclip className="h-4 w-4 shrink-0" />
              <span>{typeof item === "string" ? item : JSON.stringify(item)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

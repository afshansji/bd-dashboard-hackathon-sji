import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Clock, Download, Inbox } from "lucide-react";
import type {
  FeedbackAttachment,
  FeedbackPriority,
  FeedbackReport,
  FeedbackStatus,
} from "../api";
import { FEEDBACK_MODULE_OPTIONS } from "../constants";

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  open: "Open",
  in_review: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

const STATUS_STYLES: Record<FeedbackStatus, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-100",
  in_review: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100",
  resolved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100",
  closed: "bg-slate-200 text-slate-700 dark:bg-slate-800/60 dark:text-slate-100",
};

const STATUS_OPTIONS: FeedbackStatus[] = ["open", "in_review", "resolved", "closed"];

const PRIORITY_LABELS: Record<FeedbackPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const PRIORITY_STYLES: Record<FeedbackPriority, string> = {
  low: "bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-100",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-100",
  high: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-100",
};

interface FeedbackDetailCardProps {
  feedback: FeedbackReport;
  attachments?: FeedbackAttachment[];
  legacyAttachmentUrl?: string | null;
  canEditStatus?: boolean;
  canEditPriority?: boolean;
  canEditModule?: boolean;
  canArchive?: boolean;
  headerActions?: ReactNode;
  onStatusChange?: (status: FeedbackStatus) => void;
  onPriorityChange?: (priority: FeedbackPriority | null) => void;
  onModuleChange?: (module: string | null) => void;
  onArchive?: () => void;
  isUpdating?: boolean;
}

export function FeedbackDetailCard({
  feedback,
  attachments,
  legacyAttachmentUrl,
  canEditStatus = false,
  canEditPriority = false,
  canEditModule = false,
  canArchive = false,
  headerActions,
  onStatusChange,
  onPriorityChange,
  onModuleChange,
  onArchive,
  isUpdating = false,
}: FeedbackDetailCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex flex-wrap items-center gap-2 text-xl">
              <Clock className="h-5 w-5" />
              {feedback.subject}
              {!canEditStatus && (
                <Badge variant="outline" className="text-xs">
                  View Only
                </Badge>
              )}
            </CardTitle>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant={feedback.type === "bug" ? "destructive" : "default"}>
                {feedback.type === "bug" ? "Bug" : "Feature"}
              </Badge>
              <Badge variant="outline" className="text-xs">
                #{feedback.feedback_number ?? "—"}
              </Badge>
              <Badge className={cn("text-xs", STATUS_STYLES[feedback.status])}>
                {STATUS_LABELS[feedback.status]}
              </Badge>
              {feedback.module && (
                <Badge variant="secondary" className="text-xs">
                  {feedback.module}
                </Badge>
              )}
              {feedback.priority && (
                <Badge className={cn("text-xs", PRIORITY_STYLES[feedback.priority])}>
                  {PRIORITY_LABELS[feedback.priority]}
                </Badge>
              )}
            </div>
          </div>
          {headerActions ? <div className="flex shrink-0">{headerActions}</div> : null}
        </div>
        <CardDescription>
          View submission details, attachment, and workflow status.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-4">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Submitted by</p>
              <p className="font-medium">
                {feedback.submitted_by_name ?? feedback.email ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">{feedback.email ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Submitted on</p>
              <p className="font-medium">{new Date(feedback.created_at).toLocaleString()}</p>
            </div>
            {feedback.reviewed_by_name && (
              <div>
                <p className="text-muted-foreground">Currently handled by</p>
                <p className="font-medium">{feedback.reviewed_by_name}</p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground">Module</p>
              <p className="font-medium">{feedback.module ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Record ID</p>
              <p className="font-mono text-xs">{feedback.id}</p>
            </div>
          </div>

          {feedback.description && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Description</p>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {feedback.description}
              </p>
            </div>
          )}

          {/* Display multiple attachments if available */}
          {attachments && attachments.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Attachments ({attachments.length})</p>
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <Button
                    key={attachment.id}
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2"
                  >
                    <a
                      href={attachment.signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="h-4 w-4" />
                      <span className="truncate flex-1 text-left">{attachment.fileName}</span>
                      {attachment.fileSize && (
                        <span className="text-xs text-muted-foreground">
                          {(attachment.fileSize / 1024).toFixed(2)} KB
                        </span>
                      )}
                    </a>
                  </Button>
                ))}
              </div>
            </div>
          ) : legacyAttachmentUrl ? (
            <Button asChild variant="outline" className="gap-2">
              <a href={legacyAttachmentUrl} target="_blank" rel="noopener noreferrer">
                <Inbox className="h-4 w-4" /> View attachment
              </a>
            </Button>
          ) : null}

          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold">Status</p>
              <Select
                value={feedback.status}
                onValueChange={(value) => onStatusChange?.(value as FeedbackStatus)}
                disabled={!canEditStatus || isUpdating}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-sm font-semibold">
                Priority
                {!canEditPriority && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    (View only)
                  </span>
                )}
              </p>
              <Select
                value={feedback.priority ?? "none"}
                onValueChange={(value) =>
                  onPriorityChange?.(value === "none" ? null : (value as FeedbackPriority))
                }
                disabled={!canEditPriority || isUpdating}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-sm font-semibold">
                Module
                {!canEditModule && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    (View only)
                  </span>
                )}
              </p>
              <Select
                value={feedback.module ?? "none"}
                onValueChange={(value) => onModuleChange?.(value === "none" ? null : value)}
                disabled={!canEditModule || isUpdating}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  {FEEDBACK_MODULE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(canEditStatus || canArchive) && (
              <div className="flex flex-wrap gap-2">
                {canEditStatus && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onStatusChange?.("resolved")}
                    disabled={isUpdating || feedback.status === "resolved"}
                  >
                    Mark resolved
                  </Button>
                )}
                {canArchive && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={onArchive}
                    disabled={isUpdating}
                  >
                    Archive
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

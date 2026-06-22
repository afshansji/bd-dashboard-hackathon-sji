import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Send,
  Eye,
  Check,
  X,
  Ban,
  RefreshCw,
  Download,
  Clock,
  History,
  UserPlus,
  UserMinus,
  Bell,
} from "lucide-react";
import { useSigningDocumentActivity } from "@/hooks/useSigningDocuments";
import type { SigningActivityLog as ActivityLogEntry } from "@/types/signing";

interface ActivityLogProps {
  documentId: string;
}

export const ActivityLog = ({ documentId }: ActivityLogProps) => {
  const { data: activities, isLoading } = useSigningDocumentActivity(documentId);

  const getActivityIcon = (action: string) => {
    const iconClass = "h-4 w-4";
    switch (action) {
      case "created":
        return <FileText className={iconClass} />;
      case "sent":
        return <Send className={iconClass} />;
      case "viewed":
        return <Eye className={iconClass} />;
      case "signed":
        return <Check className={`${iconClass} text-green-500`} />;
      case "completed":
        return <Check className={`${iconClass} text-green-600`} />;
      case "declined":
        return <X className={`${iconClass} text-red-500`} />;
      case "voided":
        return <Ban className={`${iconClass} text-orange-500`} />;
      case "expired":
        return <Clock className={`${iconClass} text-amber-500`} />;
      case "resent":
      case "reminder_sent":
        return <RefreshCw className={iconClass} />;
      case "downloaded":
        return <Download className={iconClass} />;
      case "recipient_added":
      case "watcher_added":
        return <UserPlus className={iconClass} />;
      case "recipient_removed":
      case "watcher_removed":
        return <UserMinus className={iconClass} />;
      default:
        return <Bell className={iconClass} />;
    }
  };

  const getActivityColor = (action: string) => {
    switch (action) {
      case "signed":
      case "completed":
        return "bg-green-100 border-green-200 dark:bg-green-950 dark:border-green-800";
      case "declined":
        return "bg-red-100 border-red-200 dark:bg-red-950 dark:border-red-800";
      case "voided":
        return "bg-orange-100 border-orange-200 dark:bg-orange-950 dark:border-orange-800";
      case "expired":
        return "bg-amber-100 border-amber-200 dark:bg-amber-950 dark:border-amber-800";
      default:
        return "bg-background border-border";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4" />
          <h4 className="font-semibold">Activity Log</h4>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4" />
        <h4 className="font-semibold">Activity Log</h4>
      </div>

      {!activities || activities.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

          <div className="space-y-4">
            {activities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} getIcon={getActivityIcon} getColor={getActivityColor} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// ACTIVITY ITEM
// ============================================================================

interface ActivityItemProps {
  activity: ActivityLogEntry;
  getIcon: (action: string) => React.ReactNode;
  getColor: (action: string) => string;
}

const ActivityItem = ({ activity, getIcon, getColor }: ActivityItemProps) => {
  const timeAgo = formatDistanceToNow(new Date(activity.created_at), { addSuffix: true });

  return (
    <div className="flex gap-4 relative">
      <div
        className={`w-8 h-8 rounded-full border flex items-center justify-center z-10 ${getColor(
          activity.action
        )}`}
      >
        {getIcon(activity.action)}
      </div>

      <div className="flex-1 pb-4">
        <p className="font-medium text-sm">{activity.description || formatAction(activity.action)}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <span>{timeAgo}</span>
          {activity.actor_email && (
            <>
              <span>•</span>
              <span>{activity.actor_email}</span>
            </>
          )}
          {activity.actor_type && activity.actor_type !== "user" && (
            <>
              <span>•</span>
              <span className="capitalize">{activity.actor_type}</span>
            </>
          )}
        </div>

        {/* Show metadata if available */}
        {activity.metadata && Object.keys(activity.metadata).length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded p-2">
            {Object.entries(activity.metadata).map(([key, value]) => (
              <div key={key}>
                <span className="font-medium">{formatKey(key)}:</span> {String(value)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// HELPERS
// ============================================================================

function formatAction(action: string): string {
  const actionLabels: Record<string, string> = {
    created: "Document created",
    sent: "Document sent for signatures",
    viewed: "Document viewed",
    signed: "Document signed",
    completed: "All signatures collected",
    declined: "Document declined",
    voided: "Document voided",
    expired: "Document expired",
    resent: "Reminder sent",
    reminder_sent: "Reminder sent",
    downloaded: "Document downloaded",
    recipient_added: "Recipient added",
    recipient_removed: "Recipient removed",
    watcher_added: "Watcher added",
    watcher_removed: "Watcher removed",
  };
  return actionLabels[action] || action;
}

function formatKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ============================================================================
// COMPACT VERSION FOR CARDS
// ============================================================================

interface CompactActivityLogProps {
  documentId: string;
  maxItems?: number;
}

export const CompactActivityLog = ({ documentId, maxItems = 3 }: CompactActivityLogProps) => {
  const { data: activities, isLoading } = useSigningDocumentActivity(documentId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    );
  }

  const recentActivities = activities?.slice(0, maxItems) || [];

  if (recentActivities.length === 0) {
    return <p className="text-xs text-muted-foreground">No activity</p>;
  }

  return (
    <div className="space-y-1">
      {recentActivities.map((activity) => (
        <div key={activity.id} className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">
            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
          </span>
          <span>-</span>
          <span>{activity.description || formatAction(activity.action)}</span>
        </div>
      ))}
    </div>
  );
};

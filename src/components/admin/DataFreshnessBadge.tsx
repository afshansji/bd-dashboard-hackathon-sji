import { differenceInHours, formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";

interface DataFreshnessBadgeProps {
  lastSyncedAt: string | null;
  entityType: 'deals' | 'clients' | 'projects' | 'employees' | 'pods';
}

export function DataFreshnessBadge({ lastSyncedAt, entityType }: DataFreshnessBadgeProps) {
  if (!lastSyncedAt) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="h-3 w-3" />
        Never Synced
      </Badge>
    );
  }

  const syncedDate = new Date(lastSyncedAt);
  const hoursSinceSync = differenceInHours(new Date(), syncedDate);
  
  if (hoursSinceSync < 2) {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Fresh ({formatDistanceToNow(syncedDate, { addSuffix: true })})
      </Badge>
    );
  } else if (hoursSinceSync < 12) {
    return (
      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
        <Clock className="h-3 w-3 mr-1" />
        {formatDistanceToNow(syncedDate, { addSuffix: true })}
      </Badge>
    );
  } else {
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
        <AlertCircle className="h-3 w-3 mr-1" />
        Stale ({formatDistanceToNow(syncedDate, { addSuffix: true })})
      </Badge>
    );
  }
}

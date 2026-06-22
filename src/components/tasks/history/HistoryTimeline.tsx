import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { History as HistoryIcon, AlertCircle, Database } from 'lucide-react';
import type { TaskHistoryEntry } from '@/services/taskHistoryService';
import { HistoryItem } from './HistoryItem';
import { SupabaseError } from '@/utils/supabaseErrors';

interface HistoryTimelineProps {
  history: TaskHistoryEntry[];
  isLoading: boolean;
  error?: Error | null;
}

export function HistoryTimeline({ history, isLoading, error }: HistoryTimelineProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    const isTableMissing = error instanceof SupabaseError && error.isTableMissing;
    const errorMessage = error.message || 'Failed to load history';

    return (
      <Alert variant={isTableMissing ? "default" : "destructive"}>
        {isTableMissing ? <Database className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
        <AlertTitle>{isTableMissing ? 'Migration Required' : 'Error Loading History'}</AlertTitle>
        <AlertDescription>
          {isTableMissing ? (
            <div className="space-y-2">
              <p>The task history feature requires a database migration.</p>
              <p className="text-sm font-mono bg-muted p-2 rounded">
                Please run the migration SQL from MIGRATION_TO_RUN.sql file in your Supabase dashboard.
              </p>
            </div>
          ) : (
            <p>{errorMessage}</p>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <HistoryIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-sm text-muted-foreground">
          No changes recorded yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {history.map((entry) => (
        <HistoryItem key={entry.id} entry={entry} />
      ))}
    </div>
  );
}


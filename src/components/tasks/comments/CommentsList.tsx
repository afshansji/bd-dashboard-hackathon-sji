import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MessageSquare, AlertCircle, Database } from 'lucide-react';
import type { TaskComment } from '@/types/comments';
import { CommentItem } from './CommentItem';
import { SupabaseError } from '@/utils/supabaseErrors';

interface CommentsListProps {
  comments: TaskComment[];
  isLoading: boolean;
  error?: Error | null;
  onUpdateComment?: (commentId: string, newText: string) => void;
  onDeleteComment?: (commentId: string) => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

export function CommentsList({ comments, isLoading, error, onUpdateComment, onDeleteComment, isUpdating, isDeleting }: CommentsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    const isTableMissing = error instanceof SupabaseError && error.isTableMissing;
    const errorMessage = error.message || 'Failed to load comments';

    return (
      <Alert variant={isTableMissing ? "default" : "destructive"}>
        {isTableMissing ? <Database className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
        <AlertTitle>{isTableMissing ? 'Migration Required' : 'Error Loading Comments'}</AlertTitle>
        <AlertDescription>
          {isTableMissing ? (
            <div className="space-y-2">
              <p>The task comments feature requires a database migration.</p>
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

  if (comments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-sm text-muted-foreground">
          No comments yet. Be the first to comment!
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y max-w-full overflow-hidden">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          onUpdate={onUpdateComment}
          onDelete={onDeleteComment}
          isUpdating={isUpdating}
          isDeleting={isDeleting}
        />
      ))}
    </div>
  );
}


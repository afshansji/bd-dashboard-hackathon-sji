import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, MessageSquare, History as HistoryIcon, ChevronDown } from 'lucide-react';
import { useTaskDetail } from '@/hooks/useTaskDetail';
import { useTaskComments } from '@/hooks/useTaskComments';
import { useTaskHistory } from '@/hooks/useTaskHistory';
import { useDeleteProjectTask } from '@/hooks/useProjectTasks';
import { TaskDetailsPanel } from '@/components/tasks/TaskDetailsPanel';
import { CommentsList } from '@/components/tasks/comments/CommentsList';
import { CommentComposer } from '@/components/tasks/comments/CommentComposer';
import { HistoryTimeline } from '@/components/tasks/history/HistoryTimeline';
import { TaskForm } from '@/components/tasks/TaskForm';

export default function TaskViewPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [showEditForm, setShowEditForm] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const { task, isLoading: taskLoading, error: taskError, refetch: refetchTask } = useTaskDetail(taskId);
  const { comments, isLoading: commentsLoading, error: commentsError, createComment, isCreating, updateComment, isUpdating, deleteComment, isDeleting } = useTaskComments(taskId);
  const { history, isLoading: historyLoading, error: historyError } = useTaskHistory(isHistoryOpen ? taskId : undefined);
  const deleteTask = useDeleteProjectTask();

  const handleDelete = () => {
    if (!task) return;
    
    if (window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      deleteTask.mutate(task.id, {
        onSuccess: () => {
          navigate('/bd/actions/tasks');
        },
      });
    }
  };

  const handleCommentSubmit = (text: string) => {
    if (!taskId || !task) return;

    createComment({
      data: {
        task_id: taskId,
        body_text: text,
        mentioned_user_ids: [], // Extracted automatically in hook
      },
      taskTitle: task.title,
    });
  };

  const handleCommentUpdate = (commentId: string, newText: string) => {
    updateComment({ commentId, bodyText: newText });
  };

  const handleCommentDelete = (commentId: string) => {
    if (window.confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
      deleteComment(commentId);
    }
  };

  if (taskLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-6">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div>
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (taskError || !task) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/bd/actions/tasks')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tasks
        </Button>

        <Alert variant="destructive">
          <AlertDescription>
            {taskError ? 'Failed to load task details.' : 'Task not found.'}
            <Button
              variant="link"
              onClick={() => refetchTask()}
              className="ml-2"
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/bd/actions/tasks')}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Tasks
      </Button>

      {/* Main Content - Responsive Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column - Task Details & History */}
        <div className="space-y-6">
          <TaskDetailsPanel
            task={task}
            onEdit={() => setShowEditForm(true)}
            onDelete={handleDelete}
          />

          {/* Collapsible History Section */}
          <Collapsible open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <HistoryIcon className="h-4 w-4" />
                      History
                    </CardTitle>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${isHistoryOpen ? 'transform rotate-180' : ''}`}
                    />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <HistoryTimeline
                    history={history}
                    isLoading={historyLoading}
                    error={historyError}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        {/* Right Column - Comments */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comments
                {comments.length > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">({comments.length})</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Editor at the top */}
              <CommentComposer
                onSubmit={handleCommentSubmit}
                isSubmitting={isCreating}
              />

              {/* Comments list below - with latest first */}
              <CommentsList
                comments={[...comments].reverse()}
                isLoading={commentsLoading}
                error={commentsError}
                onUpdateComment={handleCommentUpdate}
                onDeleteComment={handleCommentDelete}
                isUpdating={isUpdating}
                isDeleting={isDeleting}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Task Dialog */}
      <TaskForm
        open={showEditForm}
        onOpenChange={setShowEditForm}
        task={task}
      />
    </div>
  );
}


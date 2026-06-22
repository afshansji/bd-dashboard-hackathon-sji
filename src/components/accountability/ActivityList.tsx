import { useState } from 'react';
import { Plus, Edit, Trash2, Link as LinkIcon, Activity as ActivityIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useActivities, useDeleteActivity } from '@/hooks/useAccountabilityActivities';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ActivityListProps {
  repGoalId: string;
  onActivityClick?: (activityId: string) => void;
  onAddActivity?: () => void;
  onEditActivity?: (activityId: string) => void;
}

export function ActivityList({ repGoalId, onActivityClick, onAddActivity, onEditActivity }: ActivityListProps) {
  const { hasMinimumRole } = useAuth();
  const isManager = hasMinimumRole('manager');
  const { data: activities, isLoading } = useActivities(repGoalId);
  const deleteActivity = useDeleteActivity();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!activityToDelete) return;
    await deleteActivity.mutateAsync(activityToDelete);
    setDeleteDialogOpen(false);
    setActivityToDelete(null);
  };

  const getFrequencyBadge = (frequency: string) => {
    const variants: Record<string, string> = {
      daily: 'bg-blue-100 text-blue-800',
      weekly: 'bg-green-100 text-green-800',
      biweekly: 'bg-purple-100 text-purple-800',
      monthly: 'bg-yellow-100 text-yellow-800',
      one_time: 'bg-gray-100 text-gray-800',
    };
    return (
      <Badge variant="secondary" className={variants[frequency] || ''}>
        {frequency.replace('_', ' ')}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-blue-500">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading activities...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ActivityIcon className="h-5 w-5" />
            Activities
          </CardTitle>
          <Button onClick={onAddActivity} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Activity
          </Button>
        </CardHeader>
        <CardContent>
          {!activities || activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No activities yet. Add an activity to start tracking progress.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Linked Task</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => {
                  const progressPercentage = activity.target_count > 0
                    ? Math.min((activity.current_count / activity.target_count) * 100, 100)
                    : 0;

                  return (
                    <TableRow
                      key={activity.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onActivityClick?.(activity.id)}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium">{activity.title}</div>
                          {activity.description && (
                            <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
                              {activity.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getFrequencyBadge(activity.frequency)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Progress value={progressPercentage} className="w-[100px]" />
                            <span className="text-sm text-muted-foreground">
                              {progressPercentage.toFixed(0)}%
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {activity.current_count} / {activity.target_count}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(activity.status)}
                      </TableCell>
                      <TableCell>
                        {activity.linked_task ? (
                          <div className="flex items-center gap-1 text-sm text-blue-600">
                            <LinkIcon className="h-3 w-3" />
                            {activity.linked_task.title}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEditActivity?.(activity.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {isManager && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setActivityToDelete(activity.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this activity? This will also delete all associated weekly updates.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


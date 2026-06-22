import { useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
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
import { Progress } from '@/components/ui/progress';
import { GoalStatusBadge } from './GoalStatusBadge';
import { GoalForm, type GoalFormData } from './GoalForm';
import {
  useTeamGoals,
  useCreateTeamGoal,
  useUpdateTeamGoal,
  useDeleteTeamGoal,
} from '@/hooks/useAccountabilityGoals';
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

interface TeamGoalsListProps {
  quarterId: string;
  onGoalClick?: (goalId: string) => void;
}

export function TeamGoalsList({ quarterId, onGoalClick }: TeamGoalsListProps) {
  const { hasMinimumRole } = useAuth();
  const isManager = hasMinimumRole('manager');
  const { data: goals, isLoading } = useTeamGoals(quarterId);
  const createGoal = useCreateTeamGoal();
  const updateGoal = useUpdateTeamGoal();
  const deleteGoal = useDeleteTeamGoal();

  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);

  const handleCreate = async (data: GoalFormData) => {
    await createGoal.mutateAsync({
      quarter_id: quarterId,
      ...data,
    });
    setFormOpen(false);
  };

  const handleUpdate = async (data: GoalFormData) => {
    if (!editingGoal) return;
    await updateGoal.mutateAsync({
      id: editingGoal,
      updates: data,
    });
    setEditingGoal(null);
    setFormOpen(false);
  };

  const handleDelete = async () => {
    if (!goalToDelete) return;
    await deleteGoal.mutateAsync(goalToDelete);
    setDeleteDialogOpen(false);
    setGoalToDelete(null);
  };

  const getEditingGoalData = (): GoalFormData | undefined => {
    if (!editingGoal) return undefined;
    const goal = goals?.find(g => g.id === editingGoal);
    if (!goal) return undefined;
    return {
      title: goal.title,
      description: goal.description || '',
      target_value: goal.target_value,
      target_unit: goal.target_unit,
    };
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading team goals...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Team Goals</CardTitle>
        {isManager && (
          <Button onClick={() => setFormOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Team Goal
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!goals || goals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No team goals for this quarter yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Goal</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                {isManager && <TableHead className="w-[100px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {goals.map((goal) => {
                const progressPercentage = goal.target_value > 0
                  ? Math.min((goal.current_value / goal.target_value) * 100, 100)
                  : 0;

                return (
                  <TableRow
                    key={goal.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onGoalClick?.(goal.id)}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium">{goal.title}</div>
                        {goal.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {goal.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {goal.current_value} / {goal.target_value} {goal.target_unit}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={progressPercentage} className="w-[100px]" />
                        <span className="text-sm text-muted-foreground">
                          {progressPercentage.toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <GoalStatusBadge status={goal.status} />
                    </TableCell>
                    {isManager && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingGoal(goal.id);
                              setFormOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setGoalToDelete(goal.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        <GoalForm
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) setEditingGoal(null);
          }}
          quarterId={quarterId}
          onSubmit={editingGoal ? handleUpdate : handleCreate}
          isLoading={createGoal.isPending || updateGoal.isPending}
          type="team"
          initialData={getEditingGoalData()}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Team Goal</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this team goal? This will also delete all associated rep goals and activities.
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
      </CardContent>
    </Card>
  );
}


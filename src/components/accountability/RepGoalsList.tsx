import { useState } from 'react';
import { Plus, Edit, Trash2, Send, XCircle, CheckCircle } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { GoalStatusBadge } from './GoalStatusBadge';
import { GoalForm, type GoalFormData } from './GoalForm';
import {
  useRepGoals,
  useCreateRepGoal,
  useUpdateRepGoal,
  useDeleteRepGoal,
  useSubmitGoalForApproval,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RepGoalsListProps {
  quarterId: string;
  repId?: string;
  onGoalClick?: (goalId: string) => void;
  showAllReps?: boolean;
}

export function RepGoalsList({ quarterId, repId, onGoalClick, showAllReps = false }: RepGoalsListProps) {
  const { user, hasMinimumRole } = useAuth();
  const isManager = hasMinimumRole('manager');
  const { data: goals, isLoading } = useRepGoals(quarterId, showAllReps ? undefined : repId || user?.id);
  const createGoal = useCreateRepGoal();
  const updateGoal = useUpdateRepGoal();
  const deleteGoal = useDeleteRepGoal();
  const submitForApproval = useSubmitGoalForApproval();

  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [approvalFilter, setApprovalFilter] = useState<string>('all');

  const handleCreate = async (data: GoalFormData) => {
    await createGoal.mutateAsync({
      quarter_id: quarterId,
      ...data,
      rep_id: repId,
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

  const handleSubmitForApproval = async (goalId: string) => {
    await submitForApproval.mutateAsync(goalId);
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
      team_goal_id: goal.team_goal_id || undefined,
    };
  };

  const getApprovalBadge = (approvalStatus: string) => {
    switch (approvalStatus) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'pending_approval':
        return <Badge variant="default" className="bg-yellow-500">Pending Approval</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{approvalStatus}</Badge>;
    }
  };

  const filteredGoals = goals?.filter(goal => {
    if (statusFilter !== 'all' && goal.status !== statusFilter) return false;
    if (approvalFilter !== 'all' && goal.approval_status !== approvalFilter) return false;
    return true;
  });

  const canEdit = (goal: any) => {
    return (goal.rep_id === user?.id && ['draft', 'rejected'].includes(goal.approval_status)) || isManager;
  };

  const canSubmit = (goal: any) => {
    return goal.rep_id === user?.id && goal.approval_status === 'draft';
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading goals...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{showAllReps ? 'All Rep Goals' : 'My Goals'}</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={approvalFilter} onValueChange={setApprovalFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending_approval">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={() => setFormOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Goal
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!filteredGoals || filteredGoals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {goals?.length === 0 
              ? 'No goals for this quarter yet.'
              : 'No goals match the selected filters.'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {showAllReps && <TableHead>Rep</TableHead>}
                <TableHead>Goal</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Approval</TableHead>
                <TableHead className="w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGoals.map((goal) => {
                const progressPercentage = goal.target_value > 0
                  ? Math.min((goal.current_value / goal.target_value) * 100, 100)
                  : 0;

                return (
                  <TableRow
                    key={goal.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onGoalClick?.(goal.id)}
                  >
                    {showAllReps && (
                      <TableCell>
                        <div className="text-sm">
                          {goal.rep?.full_name || goal.rep?.email || 'Unknown'}
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <div>
                        <div className="font-medium">{goal.title}</div>
                        {goal.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {goal.description}
                          </div>
                        )}
                        {goal.team_goal && (
                          <div className="text-xs text-blue-600 mt-1">
                            → {goal.team_goal.title}
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
                    <TableCell>
                      {getApprovalBadge(goal.approval_status)}
                      {goal.approval_status === 'rejected' && goal.rejection_reason && (
                        <div className="text-xs text-red-600 mt-1">
                          {goal.rejection_reason}
                        </div>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        {canSubmit(goal) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSubmitForApproval(goal.id)}
                            title="Submit for approval"
                          >
                            <Send className="h-4 w-4 text-blue-600" />
                          </Button>
                        )}
                        {canEdit(goal) && (
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
                        )}
                        {isManager && (
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
                        )}
                      </div>
                    </TableCell>
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
          type="rep"
          initialData={getEditingGoalData()}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Goal</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this goal? This will also delete all associated activities and updates.
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


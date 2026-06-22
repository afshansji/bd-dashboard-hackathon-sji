import { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { usePendingApprovalGoals, useApproveGoal } from '@/hooks/useAccountabilityGoals';
import { GoalStatusBadge } from './GoalStatusBadge';

interface GoalApprovalQueueProps {
  quarterId: string;
}

export function GoalApprovalQueue({ quarterId }: GoalApprovalQueueProps) {
  const { data: pendingGoals, isLoading } = usePendingApprovalGoals(quarterId);
  const approveGoal = useApproveGoal();

  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [approvalAction, setApprovalAction] = useState<'approved' | 'rejected'>('approved');
  const [rejectionReason, setRejectionReason] = useState('');

  const handleOpenApprovalDialog = (goalId: string, action: 'approved' | 'rejected') => {
    setSelectedGoal(goalId);
    setApprovalAction(action);
    setRejectionReason('');
    setApprovalDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedGoal) return;

    await approveGoal.mutateAsync({
      goalId: selectedGoal,
      approvalData: {
        approval_status: approvalAction,
        rejection_reason: approvalAction === 'rejected' ? rejectionReason : undefined,
      },
    });

    setApprovalDialogOpen(false);
    setSelectedGoal(null);
    setRejectionReason('');
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading pending approvals...</div>;
  }

  const selectedGoalData = pendingGoals?.find(g => g.id === selectedGoal);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Goals Pending Approval</span>
            {pendingGoals && pendingGoals.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                {pendingGoals.length} goal{pendingGoals.length !== 1 ? 's' : ''} waiting
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!pendingGoals || pendingGoals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No goals pending approval.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rep</TableHead>
                  <TableHead>Goal</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Linked To</TableHead>
                  <TableHead>Current Status</TableHead>
                  <TableHead className="w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingGoals.map((goal) => (
                  <TableRow key={goal.id}>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">
                          {goal.rep?.full_name || 'Unknown'}
                        </div>
                        <div className="text-muted-foreground">
                          {goal.rep?.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{goal.title}</div>
                        {goal.description && (
                          <div className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {goal.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {goal.target_value} {goal.target_unit}
                      </div>
                    </TableCell>
                    <TableCell>
                      {goal.team_goal ? (
                        <div className="text-sm text-blue-600">
                          {goal.team_goal.title}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <GoalStatusBadge status={goal.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleOpenApprovalDialog(goal.id, 'approved')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleOpenApprovalDialog(goal.id, 'rejected')}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === 'approved' ? 'Approve Goal' : 'Reject Goal'}
            </DialogTitle>
            <DialogDescription>
              {approvalAction === 'approved'
                ? 'Are you sure you want to approve this goal?'
                : 'Please provide a reason for rejecting this goal.'}
            </DialogDescription>
          </DialogHeader>

          {selectedGoalData && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="font-medium">{selectedGoalData.title}</div>
                {selectedGoalData.description && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {selectedGoalData.description}
                  </div>
                )}
                <div className="text-sm mt-2">
                  Target: {selectedGoalData.target_value} {selectedGoalData.target_unit}
                </div>
              </div>

              {approvalAction === 'rejected' && (
                <div>
                  <Label htmlFor="rejection_reason">Rejection Reason *</Label>
                  <Textarea
                    id="rejection_reason"
                    placeholder="Explain why this goal is being rejected..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={
                (approvalAction === 'rejected' && !rejectionReason.trim()) ||
                approveGoal.isPending
              }
              className={approvalAction === 'approved' ? 'bg-green-600 hover:bg-green-700' : ''}
              variant={approvalAction === 'rejected' ? 'destructive' : 'default'}
            >
              {approveGoal.isPending
                ? 'Processing...'
                : approvalAction === 'approved'
                ? 'Approve Goal'
                : 'Reject Goal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


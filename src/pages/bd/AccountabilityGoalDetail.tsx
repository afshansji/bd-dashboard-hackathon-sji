import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';
import { useRepGoal } from '@/hooks/useAccountabilityGoals';
import { useActivities, useCreateActivity, useUpdateActivity } from '@/hooks/useAccountabilityActivities';
import { useCreateWeeklyUpdate } from '@/hooks/useAccountabilityUpdates';
import { GoalProgressChart } from '@/components/accountability/GoalProgressChart';
import { GoalStatusBadge } from '@/components/accountability/GoalStatusBadge';
import { ActivityList } from '@/components/accountability/ActivityList';
import { ActivityForm, type ActivityFormData } from '@/components/accountability/ActivityForm';
import { WeeklyUpdateForm, type WeeklyUpdateFormData } from '@/components/accountability/WeeklyUpdateForm';
import { WeeklyUpdateTimeline } from '@/components/accountability/WeeklyUpdateTimeline';

export default function AccountabilityGoalDetail() {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const { data: goal, isLoading } = useRepGoal(goalId);
  const { data: activities } = useActivities(goalId);
  const createActivity = useCreateActivity();
  const updateActivity = useUpdateActivity();
  const createWeeklyUpdate = useCreateWeeklyUpdate();

  const [activityFormOpen, setActivityFormOpen] = useState(false);
  const [weeklyUpdateFormOpen, setWeeklyUpdateFormOpen] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

  const handleCreateActivity = async (data: ActivityFormData) => {
    if (!goalId) return;
    await createActivity.mutateAsync({
      rep_goal_id: goalId,
      ...data,
    });
    setActivityFormOpen(false);
  };

  const handleUpdateActivity = async (data: ActivityFormData) => {
    if (!editingActivityId) return;
    await updateActivity.mutateAsync({
      id: editingActivityId,
      updates: data,
    });
    setEditingActivityId(null);
    setActivityFormOpen(false);
  };

  const handleCreateWeeklyUpdate = async (data: WeeklyUpdateFormData) => {
    if (!selectedActivityId) return;
    await createWeeklyUpdate.mutateAsync({
      activity_id: selectedActivityId,
      ...data,
    });
    setWeeklyUpdateFormOpen(false);
    setSelectedActivityId(null);
  };

  const handleActivityClick = (activityId: string) => {
    setSelectedActivityId(activityId);
    setWeeklyUpdateFormOpen(true);
  };

  const handleEditActivity = (activityId: string) => {
    setEditingActivityId(activityId);
    setActivityFormOpen(true);
  };

  const getEditingActivityData = (): ActivityFormData | undefined => {
    if (!editingActivityId) return undefined;
    const activity = activities?.find(a => a.id === editingActivityId);
    if (!activity) return undefined;
    return {
      title: activity.title,
      description: activity.description || '',
      frequency: activity.frequency,
      target_count: activity.target_count,
      linked_task_id: activity.linked_task_id || undefined,
      status: activity.status,
    };
  };

  const selectedActivity = activities?.find(a => a.id === selectedActivityId);

  if (isLoading) {
    return <div className="container mx-auto py-6">Loading...</div>;
  }

  if (!goal) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">Goal not found</h2>
          <Button className="mt-4" onClick={() => navigate('/bd/accountability')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Accountability Chart
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/bd/accountability')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{goal.title}</h1>
          {goal.description && (
            <p className="text-muted-foreground mt-1">{goal.description}</p>
          )}
        </div>
        <GoalStatusBadge status={goal.status} />
      </div>

      {/* Goal Progress */}
      <GoalProgressChart goal={goal} />

      {/* Activities Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <ActivityList
            repGoalId={goal.id}
            onActivityClick={handleActivityClick}
            onAddActivity={() => setActivityFormOpen(true)}
            onEditActivity={handleEditActivity}
          />
        </div>

        {/* Weekly Updates for Selected Activity */}
        <div>
          {selectedActivityId ? (
            <WeeklyUpdateTimeline activityId={selectedActivityId} />
          ) : (
            <div className="border-2 border-dashed rounded-lg p-12 text-center text-muted-foreground">
              Click on an activity to view and submit weekly updates
            </div>
          )}
        </div>
      </div>

      {/* Activity Form Dialog */}
      <ActivityForm
        open={activityFormOpen}
        onOpenChange={(open) => {
          setActivityFormOpen(open);
          if (!open) setEditingActivityId(null);
        }}
        onSubmit={editingActivityId ? handleUpdateActivity : handleCreateActivity}
        isLoading={createActivity.isPending || updateActivity.isPending}
        initialData={getEditingActivityData()}
      />

      {/* Weekly Update Form Dialog */}
      <WeeklyUpdateForm
        open={weeklyUpdateFormOpen}
        onOpenChange={(open) => {
          setWeeklyUpdateFormOpen(open);
          if (!open) setSelectedActivityId(null);
        }}
        onSubmit={handleCreateWeeklyUpdate}
        isLoading={createWeeklyUpdate.isPending}
        activityTitle={selectedActivity?.title}
      />
    </div>
  );
}


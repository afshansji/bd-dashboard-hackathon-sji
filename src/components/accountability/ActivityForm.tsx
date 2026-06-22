import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useProjectTasks } from '@/hooks/useProjectTasks';
import { useAuth } from '@/hooks/useAuth';
import type { ActivityFrequency, ActivityStatus } from '@/hooks/useAccountabilityActivities';

interface ActivityFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ActivityFormData) => void;
  isLoading?: boolean;
  initialData?: ActivityFormData;
}

export interface ActivityFormData {
  title: string;
  description: string;
  frequency: ActivityFrequency;
  target_count: number;
  linked_task_id?: string;
  status?: ActivityStatus;
}

export function ActivityForm({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  initialData,
}: ActivityFormProps) {
  const { user } = useAuth();
  const { data: tasks } = useProjectTasks();

  const [formData, setFormData] = useState<ActivityFormData>(
    initialData || {
      title: '',
      description: '',
      frequency: 'weekly',
      target_count: 1,
      linked_task_id: undefined,
      status: 'active',
    }
  );

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleSubmit = () => {
    onSubmit(formData);
    if (!initialData) {
      // Reset form if creating new
      setFormData({
        title: '',
        description: '',
        frequency: 'weekly',
        target_count: 1,
        linked_task_id: undefined,
        status: 'active',
      });
    }
  };

  const isValid =
    formData.title.trim() !== '' &&
    formData.target_count > 0;

  // Filter tasks assigned to current user
  const userTasks = tasks?.filter(task => 
    task.assigned_to === user?.id && 
    task.status !== 'completed'
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Activity' : 'Create Activity'}
          </DialogTitle>
          <DialogDescription>
            Define an activity that contributes to your goal. You can optionally link it to an existing task.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Activity Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Make 10 cold calls per day"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the activity in detail..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="frequency">Frequency *</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => setFormData({ ...formData, frequency: value as ActivityFrequency })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="one_time">One-time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="target_count">Target Count *</Label>
              <Input
                id="target_count"
                type="number"
                min="1"
                placeholder="e.g., 10"
                value={formData.target_count || ''}
                onChange={(e) => setFormData({ ...formData, target_count: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          {initialData && (
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as ActivityStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="linked_task">Link to Task (Optional)</Label>
            <Select
              value={formData.linked_task_id || 'none'}
              onValueChange={(value) =>
                setFormData({ ...formData, linked_task_id: value === 'none' ? undefined : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a task" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No task</SelectItem>
                {userTasks?.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Link this activity to an existing task in your task list
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isLoading}>
            {isLoading ? 'Saving...' : initialData ? 'Update Activity' : 'Create Activity'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


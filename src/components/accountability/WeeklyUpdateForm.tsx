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
import { getWeekDates } from '@/hooks/useAccountabilityUpdates';
import type { GoalStatus } from '@/hooks/useAccountabilityGoals';

interface WeeklyUpdateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: WeeklyUpdateFormData) => void;
  isLoading?: boolean;
  initialData?: WeeklyUpdateFormData;
  activityTitle?: string;
}

export interface WeeklyUpdateFormData {
  week_start_date: string;
  week_end_date: string;
  progress_value: number;
  progress_percentage: number;
  status: GoalStatus;
  blockers?: string;
  help_needed?: string;
  notes?: string;
}

export function WeeklyUpdateForm({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  initialData,
  activityTitle,
}: WeeklyUpdateFormProps) {
  const currentWeek = getWeekDates();

  const [formData, setFormData] = useState<WeeklyUpdateFormData>(
    initialData || {
      week_start_date: currentWeek.start,
      week_end_date: currentWeek.end,
      progress_value: 0,
      progress_percentage: 0,
      status: 'on_track',
      blockers: '',
      help_needed: '',
      notes: '',
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
        week_start_date: currentWeek.start,
        week_end_date: currentWeek.end,
        progress_value: 0,
        progress_percentage: 0,
        status: 'on_track',
        blockers: '',
        help_needed: '',
        notes: '',
      });
    }
  };

  const isValid =
    formData.progress_value >= 0 &&
    formData.progress_percentage >= 0 &&
    formData.progress_percentage <= 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Weekly Update' : 'Submit Weekly Update'}
          </DialogTitle>
          <DialogDescription>
            {activityTitle && `For activity: ${activityTitle}`}
            <br />
            Update your progress for the week.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="week_start">Week Start *</Label>
              <Input
                id="week_start"
                type="date"
                value={formData.week_start_date}
                onChange={(e) => setFormData({ ...formData, week_start_date: e.target.value })}
                disabled={!!initialData}
              />
            </div>

            <div>
              <Label htmlFor="week_end">Week End *</Label>
              <Input
                id="week_end"
                type="date"
                value={formData.week_end_date}
                onChange={(e) => setFormData({ ...formData, week_end_date: e.target.value })}
                disabled={!!initialData}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="progress_value">Progress Value *</Label>
              <Input
                id="progress_value"
                type="number"
                min="0"
                step="0.1"
                placeholder="e.g., 5"
                value={formData.progress_value || ''}
                onChange={(e) => setFormData({ ...formData, progress_value: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Work completed this week (numeric)
              </p>
            </div>

            <div>
              <Label htmlFor="progress_percentage">Progress Percentage *</Label>
              <Input
                id="progress_percentage"
                type="number"
                min="0"
                max="100"
                placeholder="e.g., 80"
                value={formData.progress_percentage || ''}
                onChange={(e) => setFormData({ ...formData, progress_percentage: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Overall completion (0-100%)
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="status">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value as GoalStatus })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on_track">On Track</SelectItem>
                <SelectItem value="at_risk">At Risk</SelectItem>
                <SelectItem value="off_track">Off Track</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="blockers">Blockers</Label>
            <Textarea
              id="blockers"
              placeholder="Any obstacles or blockers you're facing..."
              value={formData.blockers}
              onChange={(e) => setFormData({ ...formData, blockers: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="help_needed">Help Needed</Label>
            <Textarea
              id="help_needed"
              placeholder="What help or support do you need..."
              value={formData.help_needed}
              onChange={(e) => setFormData({ ...formData, help_needed: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes or comments..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isLoading}>
            {isLoading ? 'Saving...' : initialData ? 'Update' : 'Submit Update'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


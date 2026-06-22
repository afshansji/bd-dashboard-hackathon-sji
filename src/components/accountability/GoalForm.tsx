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
import { useTeamGoals } from '@/hooks/useAccountabilityGoals';

interface GoalFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quarterId: string;
  onSubmit: (data: GoalFormData) => void;
  isLoading?: boolean;
  type: 'team' | 'rep';
  initialData?: GoalFormData;
}

export interface GoalFormData {
  title: string;
  description: string;
  target_value: number;
  target_unit: string;
  team_goal_id?: string;
}

export function GoalForm({
  open,
  onOpenChange,
  quarterId,
  onSubmit,
  isLoading,
  type,
  initialData,
}: GoalFormProps) {
  const { data: teamGoals } = useTeamGoals(quarterId);
  
  const [formData, setFormData] = useState<GoalFormData>(
    initialData || {
      title: '',
      description: '',
      target_value: 0,
      target_unit: '',
      team_goal_id: undefined,
    }
  );

  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData(initialData);
      } else {
        setFormData({
          title: '',
          description: '',
          target_value: 0,
          target_unit: '',
          team_goal_id: undefined,
        });
      }
    }
  }, [open, initialData]);

  const handleSubmit = () => {
    onSubmit(formData);
    if (!initialData) {
      // Reset form if creating new
      setFormData({
        title: '',
        description: '',
        target_value: 0,
        target_unit: '',
        team_goal_id: undefined,
      });
    }
  };

  const isValid =
    formData.title.trim() !== '' &&
    formData.target_value > 0 &&
    formData.target_unit.trim() !== '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit' : 'Create'} {type === 'team' ? 'Team' : 'Rep'} Goal
          </DialogTitle>
          <DialogDescription>
            {type === 'team'
              ? 'Define a quarterly goal for the entire BD team.'
              : 'Propose a quarterly goal for yourself. It will require manager approval.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Goal Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Close 50 deals this quarter"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the goal in detail..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="target_value">Target Value *</Label>
              <Input
                id="target_value"
                type="number"
                min="1"
                placeholder="e.g., 50"
                value={formData.target_value || ''}
                onChange={(e) => setFormData({ ...formData, target_value: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label htmlFor="target_unit">Unit *</Label>
              <Input
                id="target_unit"
                placeholder="e.g., deals, revenue, meetings"
                value={formData.target_unit}
                onChange={(e) => setFormData({ ...formData, target_unit: e.target.value })}
              />
            </div>
          </div>

          {type === 'rep' && teamGoals && teamGoals.length > 0 && (
            <div>
              <Label htmlFor="team_goal">Link to Team Goal (Optional)</Label>
              <Select
                value={formData.team_goal_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, team_goal_id: value === 'none' ? undefined : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team goal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No team goal</SelectItem>
                  {teamGoals.map((goal) => (
                    <SelectItem key={goal.id} value={goal.id}>
                      {goal.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isLoading}>
            {isLoading ? 'Saving...' : initialData ? 'Update Goal' : 'Create Goal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


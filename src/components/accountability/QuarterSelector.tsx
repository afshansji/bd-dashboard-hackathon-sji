import { useState } from 'react';
import { Plus, Calendar } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuarters, useCreateQuarter, useActiveQuarter, type QuarterStatus } from '@/hooks/useAccountabilityQuarters';
import { useAuth } from '@/hooks/useAuth';

interface QuarterSelectorProps {
  value: string | undefined;
  onChange: (quarterId: string) => void;
}

export function QuarterSelector({ value, onChange }: QuarterSelectorProps) {
  const { hasMinimumRole } = useAuth();
  const isManager = hasMinimumRole('manager');
  const { data: quarters, isLoading } = useQuarters();
  const { data: activeQuarter } = useActiveQuarter();
  const createQuarter = useCreateQuarter();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    status: 'planning' as QuarterStatus,
  });

  // Set initial value to active quarter if not set
  if (!value && activeQuarter && quarters) {
    onChange(activeQuarter.id);
  }

  const handleCreate = async () => {
    await createQuarter.mutateAsync(formData);
    setDialogOpen(false);
    setFormData({
      name: '',
      start_date: '',
      end_date: '',
      status: 'planning',
    });
  };

  if (isLoading) {
    return <div className="h-10 w-[200px] animate-pulse bg-gray-200 rounded" />;
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select quarter">
            {value && quarters?.find(q => q.id === value)?.name}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {quarters?.map((quarter) => (
            <SelectItem key={quarter.id} value={quarter.id}>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {quarter.name}
                {quarter.status === 'active' && (
                  <span className="ml-2 text-xs text-green-600">(Active)</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isManager && (
        <>
          <Button variant="outline" size="icon" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Quarter</DialogTitle>
                <DialogDescription>
                  Add a new quarterly period for accountability tracking.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Quarter Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Q1 2026"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as QuarterStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!formData.name || !formData.start_date || !formData.end_date || createQuarter.isPending}
                >
                  {createQuarter.isPending ? 'Creating...' : 'Create Quarter'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}


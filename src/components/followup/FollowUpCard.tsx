import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Mail, Phone, Linkedin, Users, MoreVertical, CheckCircle, Edit, Trash2, Sparkles } from 'lucide-react';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { useState } from 'react';
import { useFollowUpMutations, type FollowUp } from '@/hooks/useFollowUps';
import { FollowUpDialog } from './FollowUpDialog';

const typeIcons = {
  email: Mail,
  call: Phone,
  linkedin: Linkedin,
  meeting: Users,
  other: Calendar,
};

const priorityColors = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-700',
  overdue: 'bg-red-100 text-red-700',
};

export function FollowUpCard({ followUp }: { followUp: FollowUp }) {
  const [editOpen, setEditOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const { completeFollowUp, deleteFollowUp } = useFollowUpMutations();

  const TypeIcon = typeIcons[followUp.followup_type];
  const followUpDate = new Date(followUp.date);
  const isOverdue = isPast(followUpDate) && followUp.status === 'pending';

  const getDateLabel = () => {
    if (isToday(followUpDate)) return 'Today';
    if (isTomorrow(followUpDate)) return 'Tomorrow';
    return format(followUpDate, 'MMM d, yyyy');
  };

  const handleComplete = () => {
    setIsCompleting(true);
  };

  const handleSaveComplete = async (outcome?: string, nextStep?: string) => {
    await completeFollowUp.mutateAsync({ id: followUp.id, outcome, next_step: nextStep });
    setIsCompleting(false);
  };

  return (
    <>
      <Card className={`${isOverdue ? 'border-red-300' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <Checkbox
                checked={followUp.status === 'completed'}
                onCheckedChange={() => handleComplete()}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <TypeIcon className="h-4 w-4 text-muted-foreground" />
                  <h3 className={`font-semibold ${followUp.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                    {followUp.topic}
                  </h3>
                  {followUp.auto_generated && (
                    <Sparkles className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {getDateLabel()}
                  </span>
                  <span>•</span>
                  <span>{followUp.contact}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge className={priorityColors[followUp.priority]} variant="secondary">
                {followUp.priority}
              </Badge>
              <Badge className={statusColors[followUp.status]} variant="secondary">
                {followUp.status}
              </Badge>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditOpen(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  {followUp.status === 'pending' && (
                    <DropdownMenuItem onClick={handleComplete}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark Complete
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={() => deleteFollowUp.mutate(followUp.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        {(followUp.ai_generated_message || followUp.outcome || followUp.next_step) && (
          <CardContent className="pt-0">
            {followUp.ai_generated_message && followUp.status === 'pending' && (
              <div className="bg-muted p-3 rounded-md mb-2">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{followUp.ai_generated_message}</p>
              </div>
            )}
            {followUp.outcome && (
              <div className="mb-2">
                <p className="text-sm font-medium mb-1">Outcome:</p>
                <p className="text-sm text-muted-foreground">{followUp.outcome}</p>
              </div>
            )}
            {followUp.next_step && (
              <div>
                <p className="text-sm font-medium mb-1">Next Step:</p>
                <p className="text-sm text-muted-foreground">{followUp.next_step}</p>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <FollowUpDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        followUp={followUp}
      />

      {isCompleting && (
        <Dialog open={isCompleting} onOpenChange={setIsCompleting}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete Follow-Up</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleSaveComplete(
                formData.get('outcome') as string,
                formData.get('nextStep') as string
              );
            }}>
              <div className="space-y-4">
                <div>
                  <Label>Outcome</Label>
                  <Textarea name="outcome" placeholder="What was the outcome?" rows={3} />
                </div>
                <div>
                  <Label>Next Step</Label>
                  <Input name="nextStep" placeholder="What's the next action?" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCompleting(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Complete</Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

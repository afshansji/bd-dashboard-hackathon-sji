import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { useFollowUpMutations, type FollowUp } from '@/hooks/useFollowUps';

interface FollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  followUp?: FollowUp;
  dealId?: string;
  contactId?: string;
  aiDraft?: string;
}

export function FollowUpDialog({ open, onOpenChange, followUp, dealId, contactId, aiDraft }: FollowUpDialogProps) {
  const [date, setDate] = useState<Date>(followUp?.date ? new Date(followUp.date) : new Date());
  const [topic, setTopic] = useState(followUp?.topic || '');
  const [contact, setContact] = useState(followUp?.contact || '');
  const [type, setType] = useState<string>(followUp?.followup_type || 'email');
  const [priority, setPriority] = useState<string>(followUp?.priority || 'medium');
  const [message, setMessage] = useState(followUp?.ai_generated_message || aiDraft || '');
  const [outcome, setOutcome] = useState(followUp?.outcome || '');
  const [nextStep, setNextStep] = useState(followUp?.next_step || '');

  const { createFollowUp, updateFollowUp } = useFollowUpMutations();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: any = {
      date: format(date, 'yyyy-MM-dd'),
      topic,
      contact,
      followup_type: type,
      priority,
      ai_generated_message: message,
      outcome,
      next_step: nextStep,
      deal_id: dealId,
      campaign_contact_id: contactId,
    };

    if (followUp) {
      await updateFollowUp.mutateAsync({ ...data, id: followUp.id });
    } else {
      await createFollowUp.mutateAsync(data);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{followUp ? 'Edit Follow-Up' : 'Create Follow-Up'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Contact</Label>
              <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Contact name" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Topic</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What is this follow-up about?" required />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Message Draft
              {aiDraft && <Sparkles className="h-4 w-4 text-primary" />}
            </Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Draft your message here..."
              rows={6}
            />
          </div>

          {followUp?.status === 'completed' && (
            <>
              <div className="space-y-2">
                <Label>Outcome</Label>
                <Textarea
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  placeholder="What was the outcome?"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Next Step</Label>
                <Input
                  value={nextStep}
                  onChange={(e) => setNextStep(e.target.value)}
                  placeholder="What's the next action?"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {followUp ? 'Update' : 'Create'} Follow-Up
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

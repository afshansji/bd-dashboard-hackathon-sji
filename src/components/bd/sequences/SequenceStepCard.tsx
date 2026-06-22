import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, GripVertical, Mail, Linkedin, Phone, MessageSquare } from "lucide-react";

interface SequenceStepInsert {
  sequence_id?: string;
  step_order: number;
  channel: 'email' | 'linkedin_connection' | 'linkedin_message' | 'phone_call' | 'manual_task';
  delay_value: number;
  delay_unit: 'days' | 'hours' | 'minutes';
  content_template: {
    subject?: string;
    body?: string;
    variables?: string[];
  };
  conditions?: any;
  ai_personalization_enabled?: boolean;
}

interface SequenceStepCardProps {
  step: SequenceStepInsert;
  stepNumber: number;
  onUpdate: (updates: Partial<SequenceStepInsert>) => void;
  onRemove: () => void;
}

const channelIcons = {
  email: Mail,
  linkedin_connection: Linkedin,
  linkedin_message: Linkedin,
  phone_call: Phone,
  manual_task: MessageSquare,
};

export function SequenceStepCard({ step, stepNumber, onUpdate, onRemove }: SequenceStepCardProps) {
  const Icon = channelIcons[step.channel as keyof typeof channelIcons];

  return (
    <Card className="p-4">
      <div className="flex gap-4">
        <div className="flex flex-col items-center gap-2 pt-2">
          <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            {stepNumber}
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
              <Select
                value={step.channel}
                onValueChange={(value) => onUpdate({ channel: value as 'email' | 'linkedin_connection' | 'linkedin_message' | 'phone_call' | 'manual_task' })}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="linkedin_connection">LinkedIn Connection Request</SelectItem>
                  <SelectItem value="linkedin_message">LinkedIn Message</SelectItem>
                  <SelectItem value="phone_call">Phone Call</SelectItem>
                  <SelectItem value="manual_task">Manual Task</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Delay Value</label>
              <Input
                type="number"
                min="0"
                value={step.delay_value}
                onChange={(e) => onUpdate({ delay_value: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Delay Unit</label>
              <Select
                value={step.delay_unit}
                onValueChange={(value) => onUpdate({ delay_unit: value as 'days' | 'hours' | 'minutes' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Message Content</label>
            <Textarea
              value={step.content_template?.body || ''}
              onChange={(e) => onUpdate({ 
                content_template: { 
                  ...step.content_template,
                  body: e.target.value 
                } 
              })}
              placeholder="Enter your message content with variables like {{first_name}}, {{company}}..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use variables: {`{{first_name}}, {{last_name}}, {{company}}, {{title}}`}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

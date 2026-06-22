import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { SequenceStepCard } from "./SequenceStepCard";

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

interface SequenceBuilderProps {
  name: string;
  description: string;
  steps: SequenceStepInsert[];
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onStepsChange: (steps: SequenceStepInsert[]) => void;
}

export function SequenceBuilder({
  name,
  description,
  steps,
  onNameChange,
  onDescriptionChange,
  onStepsChange,
}: SequenceBuilderProps) {
  const addStep = () => {
    const newStep: SequenceStepInsert = {
      step_order: steps.length + 1,
      channel: 'email',
      delay_value: 1,
      delay_unit: 'days',
      content_template: {
        body: '',
        variables: []
      },
      conditions: {},
      ai_personalization_enabled: false,
    };
    onStepsChange([...steps, newStep]);
  };

  const updateStep = (index: number, updates: Partial<SequenceStepInsert>) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    onStepsChange(newSteps);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    // Reorder remaining steps
    const reordered = newSteps.map((step, i) => ({
      ...step,
      step_order: i + 1
    }));
    onStepsChange(reordered);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Sequence Name</label>
          <Input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g., Enterprise Outreach Q1"
          />
        </div>
        
        <div>
          <label className="text-sm font-medium">Description</label>
          <Textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Describe the purpose and strategy of this sequence..."
            rows={3}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Sequence Steps</h3>
          <Button onClick={addStep} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Step
          </Button>
        </div>

        {steps.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">No steps added yet</p>
            <Button onClick={addStep} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add First Step
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {steps.map((step, index) => (
              <SequenceStepCard
                key={index}
                step={step}
                stepNumber={index + 1}
                onUpdate={(updates) => updateStep(index, updates)}
                onRemove={() => removeStep(index)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

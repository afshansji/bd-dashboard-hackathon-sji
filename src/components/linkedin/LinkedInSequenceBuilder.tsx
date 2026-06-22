import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Layers, ChevronDown, ChevronUp, Check } from "lucide-react";
import { useGenerateLinkedInSequence } from "@/hooks/useGenerateLinkedInSequence";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SequenceStep {
  type: 'connection_request' | 'first_followup' | 'second_followup' | 'meeting_request';
  delay_days: number;
  label: string;
}

const DEFAULT_SEQUENCE: SequenceStep[] = [
  { type: 'connection_request', delay_days: 0, label: 'Connection Request' },
  { type: 'first_followup', delay_days: 3, label: 'First Follow-up' },
  { type: 'second_followup', delay_days: 5, label: 'Second Follow-up' },
  { type: 'meeting_request', delay_days: 3, label: 'Meeting Request' },
];

interface LinkedInSequenceBuilderProps {
  contactId: string;
  contactName: string;
}

export function LinkedInSequenceBuilder({ contactId, contactName }: LinkedInSequenceBuilderProps) {
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<SequenceStep[]>(DEFAULT_SEQUENCE);
  const [userContext, setUserContext] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  
  const generateSequenceMutation = useGenerateLinkedInSequence();

  const handleGenerate = async () => {
    setCurrentStep(1);
    await generateSequenceMutation.mutateAsync({
      contactId,
      steps: steps.map(s => ({ type: s.type, delay_days: s.delay_days })),
      userContext,
    });
    setOpen(false);
    setCurrentStep(0);
  };

  const updateStepDelay = (index: number, delay: number) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, delay_days: delay } : s));
  };

  const toggleStep = (index: number) => {
    if (index === 0) return; // Connection request is required
    setSteps(prev => {
      const step = prev[index];
      if (prev.includes(step)) {
        return prev.filter((_, i) => i !== index);
      }
      return [...prev.slice(0, index), step, ...prev.slice(index)];
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Layers className="h-4 w-4 mr-2" />
          Generate Full Sequence
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate Outreach Sequence</DialogTitle>
          <DialogDescription>
            Create a complete 4-step outreach sequence for {contactName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Sequence Steps */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Sequence Steps</label>
            <div className="space-y-2">
              {steps.map((step, index) => (
                <div 
                  key={step.type}
                  className={`p-3 border rounded-lg ${
                    generateSequenceMutation.isPending && currentStep > index 
                      ? 'bg-green-50 border-green-200' 
                      : generateSequenceMutation.isPending && currentStep === index + 1
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                        {generateSequenceMutation.isPending && currentStep > index ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          index + 1
                        )}
                      </Badge>
                      <span className="text-sm font-medium">{step.label}</span>
                    </div>
                    {index > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Wait</span>
                        <select
                          value={step.delay_days}
                          onChange={(e) => updateStepDelay(index, parseInt(e.target.value))}
                          className="text-xs border rounded px-2 py-1"
                          disabled={generateSequenceMutation.isPending}
                        >
                          <option value={1}>1 day</option>
                          <option value={2}>2 days</option>
                          <option value={3}>3 days</option>
                          <option value={5}>5 days</option>
                          <option value={7}>7 days</option>
                        </select>
                      </div>
                    )}
                  </div>
                  {generateSequenceMutation.isPending && currentStep === index + 1 && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-blue-600">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Generating...
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Context */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Additional Context (optional)</label>
            <Textarea
              value={userContext}
              onChange={(e) => setUserContext(e.target.value)}
              placeholder="e.g., 'We have a mutual connection with John Smith' or 'Reference their recent company acquisition'"
              rows={3}
              disabled={generateSequenceMutation.isPending}
            />
          </div>

          {/* Info */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">
              💡 <strong>Pro tip:</strong> The AI will maintain a consistent narrative thread across all steps, 
              referencing previous messages to create natural follow-ups.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={generateSequenceMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={generateSequenceMutation.isPending}>
            {generateSequenceMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Step {currentStep}/{steps.length}...
              </>
            ) : (
              <>
                <Layers className="h-4 w-4 mr-2" />
                Generate {steps.length} Messages
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

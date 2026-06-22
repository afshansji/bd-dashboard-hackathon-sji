import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SequenceBuilder } from "./SequenceBuilder";
import { useCreateSequence, useUpdateSequence } from "@/hooks/useSequences";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBDCampaigns } from "@/hooks/useBDCampaigns";
import type { SequenceWithSteps } from "@/Api/sequences";

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

interface SequenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId?: string;
  sequence?: SequenceWithSteps;
}

export function SequenceDialog({ open, onOpenChange, campaignId, sequence }: SequenceDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<SequenceStepInsert[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | undefined>(campaignId);
  const { campaigns, isLoading } = useBDCampaigns(undefined, 1, 100);
  
  const createSequence = useCreateSequence();
  const updateSequence = useUpdateSequence();

  // Populate form when editing
  useEffect(() => {
    if (sequence) {
      setName(sequence.name);
      setDescription(sequence.description || "");
      setSelectedCampaignId(sequence.campaign_id || undefined);
      setSteps((sequence.sequence_steps || []).map(step => ({
        ...step,
        channel: step.channel as 'email' | 'linkedin_connection' | 'linkedin_message' | 'phone_call' | 'manual_task'
      })));
    } else {
      setName("");
      setDescription("");
      setSelectedCampaignId(campaignId);
      setSteps([]);
    }
  }, [sequence, campaignId]);

  const handleSave = async () => {
    if (!name.trim() || !selectedCampaignId) {
      return;
    }

    if (sequence) {
      // Edit mode: update existing sequence with steps
      await updateSequence.mutateAsync({
        id: sequence.id,
        updates: {
          name: name.trim(),
          description: description.trim() || null,
          campaign_id: selectedCampaignId,
        },
        steps: steps,
      });
    } else {
      // Create mode
      const { data: { user } } = await supabase.auth.getUser();

      await createSequence.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        campaign_id: selectedCampaignId,
        status: 'draft',
        created_by: user?.id,
        steps,
      });
    }

    // Reset form
    setName("");
    setDescription("");
    setSteps([]);
    setSelectedCampaignId(undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{sequence ? "Edit Outreach Sequence" : "Create Outreach Sequence"}</DialogTitle>
          <DialogDescription>
            {sequence ? "Update the sequence details below." : "Select a campaign to associate this sequence with, then add steps and content."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Campaign</label>
            <Select
              value={selectedCampaignId}
              onValueChange={setSelectedCampaignId}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={isLoading ? "Loading campaigns..." : "Select a campaign"} />
              </SelectTrigger>
              <SelectContent>
                {campaigns && campaigns.length > 0 ? (
                  campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-campaigns" disabled>
                    No campaigns available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <SequenceBuilder
          name={name}
          description={description}
          steps={steps}
          onNameChange={setName}
          onDescriptionChange={setDescription}
          onStepsChange={setSteps}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!name.trim() || !selectedCampaignId || createSequence.isPending || updateSequence.isPending}
          >
            {sequence 
              ? (updateSequence.isPending ? "Updating..." : "Update Sequence")
              : (createSequence.isPending ? "Creating..." : "Create Sequence")
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sequencesApi, type CreateSequencePayload, type SequenceStep } from "@/Api/sequences";
import { toast } from "sonner";

interface SequenceUpdate {
  name?: string;
  description?: string;
  campaign_id?: string;
  status?: 'draft' | 'active' | 'paused';
}

interface SequenceUpdateWithSteps {
  id: string;
  updates: SequenceUpdate;
  steps?: Omit<SequenceStep, 'id' | 'sequence_id'>[];
}

export function useSequences(campaignId?: string) {
  return useQuery({
    queryKey: ['campaign-sequences', campaignId],
    queryFn: () => sequencesApi.listSequences(campaignId),
  });
}

export function useSequence(id: string) {
  return useQuery({
    queryKey: ['campaign-sequence', id],
    queryFn: () => sequencesApi.getSequence(id),
    enabled: !!id,
  });
}

export function useCreateSequence() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: CreateSequencePayload) => sequencesApi.createSequence(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-sequences'] });
      toast.success("Sequence created successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to create sequence", {
        description: error.message
      });
    }
  });
}

export function useUpdateSequence() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates, steps }: SequenceUpdateWithSteps) => {
      if (steps !== undefined) {
        return sequencesApi.updateSequenceWithSteps(id, updates, steps);
      }
      return sequencesApi.updateSequence(id, updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-sequences'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-sequence', variables.id] });
      toast.success("Sequence updated successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to update sequence", {
        description: error.message
      });
    }
  });
}

export function useDeleteSequence() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => sequencesApi.deleteSequence(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-sequences'] });
      toast.success("Sequence deleted successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to delete sequence", {
        description: error.message
      });
    }
  });
}

export function useToggleSequence() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      sequencesApi.toggleSequence(id, isActive),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-sequences'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-sequence', variables.id] });
      toast.success(variables.isActive ? "Sequence activated" : "Sequence paused");
    },
    onError: (error: any) => {
      toast.error("Failed to toggle sequence", {
        description: error.message
      });
    }
  });
}


import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import type { TaskLabel } from './useProjectTasks';

const LABEL_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#6366F1',
  '#84CC16', '#A855F7', '#F43F5E', '#22D3EE', '#EAB308',
];

export const useTaskLabels = () => {
  const queryClient = useQueryClient();

  // Fetch all available labels
  const { data: labels = [], isLoading, error } = useQuery({
    queryKey: ['task-labels'],
    queryFn: async () => {
      // Use type assertion to work around missing table types
      const { data, error } = await (supabase as any)
        .from('task_labels')
        .select('*')
        .order('name');

      if (error) throw error;
      return (data || []) as TaskLabel[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Create a new label
  const createLabel = useMutation({
    mutationFn: async (labelName: string) => {
      // Check if label already exists
      const existing = labels.find(l => l.name.toLowerCase() === labelName.toLowerCase());
      if (existing) return existing;

      // Auto-assign color (round-robin)
      const colorIndex = labels.length % LABEL_COLORS.length;
      const color = LABEL_COLORS[colorIndex];

      // Use type assertion
      const { data, error } = await (supabase as any)
        .from('task_labels')
        .insert({
          name: labelName,
          color,
        })
        .select()
        .single();

      if (error) throw error;
      return data as TaskLabel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-labels'] });
      toast({
        title: "Label created",
        description: "New label has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create label: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Ensure label exists (create if needed)
  const ensureLabelExists = async (labelName: string): Promise<TaskLabel> => {
    const existing = labels.find(l => l.name.toLowerCase() === labelName.toLowerCase());
    if (existing) return existing;
    
    return await createLabel.mutateAsync(labelName);
  };

  // Get label by ID
  const getLabelById = (id: string) => {
    return labels.find(l => l.id === id);
  };

  return {
    labels,
    isLoading,
    error,
    createLabel: createLabel.mutate,
    createLabelAsync: createLabel.mutateAsync,
    ensureLabelExists,
    getLabelById,
  };
};

export const useTaskLabelAssociations = (taskId?: string) => {
  const queryClient = useQueryClient();

  // Fetch labels for a specific task
  const { data: taskLabels = [], isLoading } = useQuery({
    queryKey: ['task-label-associations', taskId],
    queryFn: async () => {
      if (!taskId) return [];

      // Use type assertion to work around missing table types
      const { data, error } = await (supabase as any)
        .from('project_task_labels')
        .select(`
          label_id,
          task_labels (
            id,
            name,
            color,
            created_at
          )
        `)
        .eq('task_id', taskId);

      if (error) throw error;
      
      return ((data || []) as any[]).map((item) => item.task_labels).filter(Boolean) as TaskLabel[];
    },
    enabled: !!taskId,
  });

  // Associate labels with a task
  const associateLabels = useMutation({
    mutationFn: async ({ taskId, labelIds }: { taskId: string; labelIds: string[] }) => {
      // First, remove all existing associations using type assertion
      await (supabase as any)
        .from('project_task_labels')
        .delete()
        .eq('task_id', taskId);

      // Then, add new associations
      if (labelIds.length > 0) {
        const associations = labelIds.map(labelId => ({
          task_id: taskId,
          label_id: labelId,
        }));

        const { error } = await (supabase as any)
          .from('project_task_labels')
          .insert(associations);

        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-label-associations', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['all-project-tasks'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update task labels: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return {
    taskLabels,
    isLoading,
    associateLabels: associateLabels.mutate,
    associateLabelsAsync: associateLabels.mutateAsync,
  };
};

import { supabase } from '@/integrations/supabase/client';
import type { ProjectTask } from '@/hooks/useProjectTasks';
import { computeTaskDiff, type TaskChange } from '@/utils/taskDiff';
import { handleSupabaseError } from '@/utils/supabaseErrors';

export interface TaskHistoryEntry {
  id: string;
  task_id: string;
  actor_id: string | null;
  action_type: 'create' | 'update' | 'delete';
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  actor?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

/**
 * Record task history for changes
 */
export async function recordTaskHistory(
  taskId: string,
  oldTask: ProjectTask,
  newTask: Partial<ProjectTask>,
  actorId: string
): Promise<void> {
  const changes = computeTaskDiff(oldTask, newTask);

  if (changes.length === 0) {
    return; // No changes to record
  }

  const historyEntries = changes.map((change) => ({
    task_id: taskId,
    actor_id: actorId,
    action_type: 'update' as const,
    field_name: change.field,
    old_value: change.oldValue,
    new_value: change.newValue,
  }));

  try {
    // Use type assertion to work around missing table types
    const { error } = await (supabase as any)
      .from('task_history')
      .insert(historyEntries);

    if (error) {
      handleSupabaseError(error, 'task_history');
    }
  } catch (error) {
    console.error('Failed to record task history:', error);
    throw error;
  }
}

/**
 * Record task creation
 */
export async function recordTaskCreation(
  taskId: string,
  actorId: string
): Promise<void> {
  try {
    // Use type assertion
    const { error } = await (supabase as any)
      .from('task_history')
      .insert({
        task_id: taskId,
        actor_id: actorId,
        action_type: 'create',
        field_name: null,
        old_value: null,
        new_value: null,
      });

    if (error) {
      handleSupabaseError(error, 'task_history');
    }
  } catch (error) {
    console.error('Failed to record task creation:', error);
    throw error;
  }
}

/**
 * Fetch task history
 */
export async function fetchTaskHistory(taskId: string): Promise<TaskHistoryEntry[]> {
  try {
    console.log(`Fetching task history for task: ${taskId}`);

    // First, fetch history records without joins
    const { data, error } = await (supabase as any)
      .from('task_history')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching task history:', error);
      handleSupabaseError(error, 'task_history');
    }

    if (!data || data.length === 0) {
      console.log('No history entries found for this task');
      return [];
    }

    console.log(`Fetched ${data.length} history entries`);

    // Then fetch actor info separately for each entry
    const historyWithActors = await Promise.all(
      data.map(async (entry: any) => {
        if (!entry.actor_id) {
          return {
            ...entry,
            actor: null,
          };
        }

        try {
          const { data: actorData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', entry.actor_id)
            .single();

          return {
            ...entry,
            actor: actorData || { id: entry.actor_id, full_name: 'Unknown', avatar_url: null },
          };
        } catch (err) {
          console.warn('Failed to fetch actor for history entry:', err);
          return {
            ...entry,
            actor: { id: entry.actor_id, full_name: 'Unknown', avatar_url: null },
          };
        }
      })
    );

    return historyWithActors as TaskHistoryEntry[];
  } catch (error) {
    console.error('Failed to fetch task history:', error);
    throw error;
  }
}

/**
 * Record label changes specifically
 */
export async function recordLabelChanges(
  taskId: string,
  oldLabelIds: string[],
  newLabelIds: string[],
  actorId: string,
  labelNames: Map<string, string>
): Promise<void> {
  const added = newLabelIds.filter(id => !oldLabelIds.includes(id));
  const removed = oldLabelIds.filter(id => !newLabelIds.includes(id));

  const entries: any[] = [];

  for (const labelId of added) {
    entries.push({
      task_id: taskId,
      actor_id: actorId,
      action_type: 'update',
      field_name: 'label_added',
      old_value: null,
      new_value: labelNames.get(labelId) || labelId,
    });
  }

  for (const labelId of removed) {
    entries.push({
      task_id: taskId,
      actor_id: actorId,
      action_type: 'update',
      field_name: 'label_removed',
      old_value: labelNames.get(labelId) || labelId,
      new_value: null,
    });
  }

  if (entries.length > 0) {
    try {
      // Use type assertion
      const { error } = await (supabase as any)
        .from('task_history')
        .insert(entries);

      if (error) {
        handleSupabaseError(error, 'task_history');
      }
    } catch (error) {
      console.error('Failed to record label changes:', error);
      // Don't throw, this is a non-critical operation
    }
  }
}

/**
 * Record attachment changes
 */
export async function recordAttachmentChange(
  taskId: string,
  action: 'added' | 'removed',
  fileName: string,
  actorId: string
): Promise<void> {
  try {
    // Use type assertion
    const { error } = await (supabase as any)
      .from('task_history')
      .insert({
        task_id: taskId,
        actor_id: actorId,
        action_type: 'update',
        field_name: action === 'added' ? 'attachment_added' : 'attachment_removed',
        old_value: action === 'removed' ? fileName : null,
        new_value: action === 'added' ? fileName : null,
      });

    if (error) {
      handleSupabaseError(error, 'task_history');
    }
  } catch (error) {
    console.error('Failed to record attachment change:', error);
    // Don't throw, this is a non-critical operation
  }
}

import type { ProjectTask } from '@/hooks/useProjectTasks';

export interface TaskChange {
  field: string;
  oldValue: string | null;
  newValue: string | null;
  displayOldValue?: string;
  displayNewValue?: string;
}

/**
 * Compute differences between old and new task states
 * Returns an array of changes for audit logging
 */
export function computeTaskDiff(
  oldTask: ProjectTask,
  newTask: Partial<ProjectTask>
): TaskChange[] {
  const changes: TaskChange[] = [];

  // Helper to format values for display
  const formatValue = (value: any): string | null => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  // Check each field that might have changed
  const fieldsToCheck: (keyof ProjectTask)[] = [
    'title',
    'description',
    'status',
    'priority',
    'assigned_to',
    'due_date',
    'estimated_hours',
    'is_campaign_associated',
    'campaign_id',
    'google_folder',
    'active_collab_link',
    'workboard_ai_link',
    'reference_url',
  ];

  for (const field of fieldsToCheck) {
    const oldValue = oldTask[field];
    const newValue = newTask[field];

    // Skip if values are the same
    if (oldValue === newValue) continue;

    // Skip if both are nullish
    if ((oldValue === null || oldValue === undefined) && 
        (newValue === null || newValue === undefined)) continue;

    changes.push({
      field: String(field),
      oldValue: formatValue(oldValue),
      newValue: formatValue(newValue),
      displayOldValue: getDisplayValue(field, oldValue),
      displayNewValue: getDisplayValue(field, newValue),
    });
  }

  return changes;
}

/**
 * Get human-readable display value for a field
 */
function getDisplayValue(field: string, value: any): string {
  if (value === null || value === undefined || value === '') return 'None';

  switch (field) {
    case 'status':
      return formatStatus(value);
    case 'priority':
      return formatPriority(value);
    case 'is_campaign_associated':
      return value ? 'Yes' : 'No';
    case 'google_folder':
      if (typeof value === 'object' && value !== null) {
        return value.name || value.url || 'Google Drive Folder';
      }
      return 'Google Drive Folder';
    case 'estimated_hours':
      return `${value}h`;
    case 'due_date':
      return new Date(value).toLocaleDateString();
    default:
      return String(value);
  }
}

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'todo': 'To Do',
    'in_progress': 'In Progress',
    'review': 'In Review',
    'completed': 'Completed',
    'blocked': 'Blocked',
    'pending': 'Pending',
  };
  return statusMap[status] || status;
}

function formatPriority(priority: string): string {
  const priorityMap: Record<string, string> = {
    'low': 'Low',
    'medium': 'Medium',
    'high': 'High',
    'urgent': 'Urgent',
  };
  return priorityMap[priority] || priority;
}

/**
 * Generate a human-readable message for a task change
 */
export function generateChangeMessage(
  change: TaskChange,
  actorName: string
): string {
  const field = formatFieldName(change.field);
  const oldVal = change.displayOldValue || change.oldValue || 'None';
  const newVal = change.displayNewValue || change.newValue || 'None';

  return `${actorName} changed ${field} from "${oldVal}" to "${newVal}"`;
}

function formatFieldName(field: string): string {
  const fieldMap: Record<string, string> = {
    'title': 'Title',
    'description': 'Description',
    'status': 'Status',
    'priority': 'Priority',
    'assigned_to': 'Assignee',
    'due_date': 'Due Date',
    'estimated_hours': 'Estimated Hours',
    'is_campaign_associated': 'Campaign Association',
    'campaign_id': 'Campaign',
    'google_folder': 'Google Drive Folder',
    'active_collab_link': 'Active Collab Link',
    'workboard_ai_link': 'Workboard AI Link',
    'reference_url': 'Reference URL',
  };
  return fieldMap[field] || field;
}


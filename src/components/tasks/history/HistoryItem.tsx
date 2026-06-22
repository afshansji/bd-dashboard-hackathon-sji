import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { 
  Edit, 
  UserPlus, 
  Tag, 
  FolderOpen, 
  Paperclip, 
  Link, 
  CheckCircle,
  AlertCircle 
} from 'lucide-react';
import type { TaskHistoryEntry } from '@/services/taskHistoryService';

interface HistoryItemProps {
  entry: TaskHistoryEntry;
}

function getActionIcon(fieldName: string | null) {
  if (!fieldName) return Edit;
  
  switch (fieldName) {
    case 'assigned_to':
      return UserPlus;
    case 'label_added':
    case 'label_removed':
      return Tag;
    case 'google_folder':
      return FolderOpen;
    case 'attachment_added':
    case 'attachment_removed':
      return Paperclip;
    case 'active_collab_link':
    case 'workboard_ai_link':
    case 'reference_url':
      return Link;
    case 'status':
      return CheckCircle;
    case 'priority':
      return AlertCircle;
    default:
      return Edit;
  }
}

function formatFieldName(fieldName: string | null): string {
  if (!fieldName) return 'task';
  
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
    'label_added': 'Label',
    'label_removed': 'Label',
    'attachment_added': 'Attachment',
    'attachment_removed': 'Attachment',
  };
  
  return fieldMap[fieldName] || fieldName;
}

function generateMessage(entry: TaskHistoryEntry): string {
  const actorName = entry.actor?.full_name || 'Someone';
  
  if (entry.action_type === 'create') {
    return `${actorName} created this task`;
  }
  
  const fieldName = formatFieldName(entry.field_name);
  const oldValue = entry.old_value || 'None';
  const newValue = entry.new_value || 'None';
  
  if (entry.field_name === 'label_added') {
    return `${actorName} added label "${newValue}"`;
  }
  
  if (entry.field_name === 'label_removed') {
    return `${actorName} removed label "${oldValue}"`;
  }
  
  if (entry.field_name === 'attachment_added') {
    return `${actorName} added attachment "${newValue}"`;
  }
  
  if (entry.field_name === 'attachment_removed') {
    return `${actorName} removed attachment "${oldValue}"`;
  }
  
  return `${actorName} changed ${fieldName} from "${oldValue}" to "${newValue}"`;
}

export function HistoryItem({ entry }: HistoryItemProps) {
  const actorName = entry.actor?.full_name || 'Unknown User';
  const actorInitials = actorName.substring(0, 2).toUpperCase();
  const Icon = getActionIcon(entry.field_name);
  const message = generateMessage(entry);

  return (
    <div className="flex gap-3 pb-4">
      <div className="flex flex-col items-center">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={entry.actor?.avatar_url} />
          <AvatarFallback className="text-xs">{actorInitials}</AvatarFallback>
        </Avatar>
        <div className="w-px bg-border flex-1 mt-2" />
      </div>

      <div className="flex-1 pt-1">
        <div className="flex items-start gap-2">
          <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <p className="text-sm">{message}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


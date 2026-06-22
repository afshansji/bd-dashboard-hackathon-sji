import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Calendar, 
  Clock, 
  User, 
  Tag, 
  Folder, 
  Paperclip, 
  Link as LinkIcon,
  Edit,
  Trash2
} from 'lucide-react';
import type { ProjectTask } from '@/hooks/useProjectTasks';
import { format } from 'date-fns';
import { useBDTeamMembers } from '@/hooks/useBDTeamMembers';
import { useBDCampaigns } from '@/hooks/useBDCampaigns';

interface TaskDetailsPanelProps {
  task: ProjectTask;
  onEdit: () => void;
  onDelete: () => void;
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'todo': 'bg-slate-100 text-slate-800',
    'in_progress': 'bg-blue-100 text-blue-800',
    'review': 'bg-yellow-100 text-yellow-800',
    'completed': 'bg-green-100 text-green-800',
    'blocked': 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getPriorityColor = (priority: string) => {
  const colors: Record<string, string> = {
    'low': 'bg-green-100 text-green-800',
    'medium': 'bg-yellow-100 text-yellow-800',
    'high': 'bg-orange-100 text-orange-800',
    'urgent': 'bg-red-100 text-red-800',
  };
  return colors[priority] || 'bg-gray-100 text-gray-800';
};

export function TaskDetailsPanel({ task, onEdit, onDelete }: TaskDetailsPanelProps) {
  const { data: bdMembers = [] } = useBDTeamMembers();
  const { campaigns } = useBDCampaigns(undefined, 1, 100);

  const assignee = task.assigned_to 
    ? bdMembers.find(m => m.id === task.assigned_to)
    : null;

  const campaign = task.is_campaign_associated && task.campaign_id
    ? campaigns.find(c => c.id === task.campaign_id)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-4">{task.title}</h1>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="secondary" className={getStatusColor(task.status)}>
            {task.status.replace('_', ' ')}
          </Badge>
          <Badge variant="outline" className={getPriorityColor(task.priority)}>
            {task.priority}
          </Badge>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Description</CardTitle>
          </CardHeader>
          <CardContent className="overflow-hidden">
            <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">{task.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Assignee */}
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Assignee:</span>
            {assignee ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={assignee.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {assignee.full_name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{assignee.full_name}</span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Unassigned</span>
            )}
          </div>

          {/* Due Date */}
          {task.due_date && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Due Date:</span>
              <span className="text-sm">{format(new Date(task.due_date), 'PPP')}</span>
            </div>
          )}

          {/* Estimated Hours */}
          {task.estimated_hours && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Estimated:</span>
              <span className="text-sm">{task.estimated_hours}h</span>
            </div>
          )}

          {/* Campaign */}
          {campaign && (
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Campaign:</span>
              <Badge variant="secondary">{campaign.name}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Labels</CardTitle>
          </CardHeader>
          <CardContent className="overflow-hidden">
            <div className="flex flex-wrap gap-2">
              {task.labels.map((label: any) => (
                <Badge
                  key={label.id}
                  variant="secondary"
                  style={{
                    backgroundColor: `${label.color}20`,
                    color: label.color,
                    borderColor: label.color
                  }}
                  className="border max-w-full truncate"
                >
                  {label.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Google Drive Folder */}
      {task.google_folder && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Google Drive</CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href={task.google_folder.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Folder className="h-4 w-4" />
              {task.google_folder.name || 'View Folder'}
            </a>
          </CardContent>
        </Card>
      )}

      {/* Attachments */}
      {task.attachments && task.attachments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Attachments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {task.attachments.map((attachment: any) => (
                <div key={attachment.id} className="flex items-center gap-2 text-sm">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span>{attachment.file_name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(attachment.file_size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Optional Links */}
      {(task.active_collab_link || task.workboard_ai_link || task.reference_url) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {task.active_collab_link && (
              <a
                href={task.active_collab_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <LinkIcon className="h-4 w-4" />
                Active Collab
              </a>
            )}
            {task.workboard_ai_link && (
              <a
                href={task.workboard_ai_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <LinkIcon className="h-4 w-4" />
                Workboard AI
              </a>
            )}
            {task.reference_url && (
              <a
                href={task.reference_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <LinkIcon className="h-4 w-4" />
                Reference
              </a>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}


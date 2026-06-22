import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProjectTask, useUpdateProjectTask, useDeleteProjectTask } from "@/hooks/useProjectTasks";
import { MoreHorizontal, Clock, Calendar, User, Folder, Paperclip, ExternalLink, Tag } from "lucide-react";
import { format } from "date-fns";
import { useBDTeamMembers } from "@/hooks/useBDTeamMembers";
import { useBDCampaigns } from "@/hooks/useBDCampaigns";
import { useNavigate } from "react-router-dom";

interface TaskCardProps {
  task: ProjectTask;
  onEdit?: (task: ProjectTask) => void;
}

const getStatusColor = (status: ProjectTask['status']) => {
  switch (status) {
    case 'todo':
      return 'bg-slate-100 text-slate-800';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800';
    case 'review':
      return 'bg-yellow-100 text-yellow-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'blocked':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-slate-100 text-slate-800';
  }
};

const getPriorityColor = (priority: ProjectTask['priority']) => {
  switch (priority) {
    case 'low':
      return 'bg-green-100 text-green-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'high':
      return 'bg-orange-100 text-orange-800';
    case 'urgent':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-slate-100 text-slate-800';
  }
};

export function TaskCard({ task, onEdit }: TaskCardProps) {
  const updateTask = useUpdateProjectTask();
  const deleteTask = useDeleteProjectTask();
  const navigate = useNavigate();
  const { data: bdMembers = [] } = useBDTeamMembers();
  const { campaigns } = useBDCampaigns(undefined, 1, 100);

  const handleStatusChange = (newStatus: ProjectTask['status']) => {
    updateTask.mutate({
      id: task.id,
      updates: { status: newStatus }
    });
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      deleteTask.mutate(task.id);
    }
  };

  const handleCardClick = () => {
    navigate(`/bd/actions/tasks/${task.id}`);
  };

  // Get assignee details
  const assignee = task.assigned_to 
    ? bdMembers.find(m => m.id === task.assigned_to)
    : null;

  // Get campaign details
  const campaign = task.is_campaign_associated && task.campaign_id
    ? campaigns.find(c => c.id === task.campaign_id)
    : null;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleCardClick}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium leading-tight">
            {task.title}
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(task)}>
                  Edit
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handleStatusChange('todo')}>
                Mark as To Do
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('in_progress')}>
                Mark as In Progress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('review')}>
                Mark as In Review
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('completed')}>
                Mark as Completed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('blocked')}>
                Mark as Blocked
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {task.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}
        
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className={getStatusColor(task.status)}>
            {task.status.replace('_', ' ')}
          </Badge>
          <Badge variant="outline" className={getPriorityColor(task.priority)}>
            {task.priority}
          </Badge>
          {campaign && (
            <Badge variant="secondary" className="bg-purple-100 text-purple-800 max-w-[200px] truncate">
              Campaign: {campaign.name}
            </Badge>
          )}
        </div>

        {/* Labels */}
        {task.labels && task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1.5 overflow-hidden">
            {task.labels.map((label) => (
              <Badge
                key={label.id}
                variant="secondary"
                style={{
                  backgroundColor: `${label.color}20`,
                  color: label.color,
                  borderColor: label.color
                }}
                className="text-xs border flex items-center gap-1 max-w-[150px]"
              >
                <Tag className="h-2.5 w-2.5 flex-shrink-0" />
                <span className="truncate">{label.name}</span>
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4 flex-wrap">
            {task.estimated_hours && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{task.estimated_hours}h est.</span>
              </div>
            )}
            {task.due_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Due {format(new Date(task.due_date), 'MMM d')}</span>
              </div>
            )}
            {task.google_folder && (
              <div className="flex items-center gap-1">
                <Folder className="h-3 w-3" />
                <span>Drive folder</span>
              </div>
            )}
            {task.attachments && task.attachments.length > 0 && (
              <div className="flex items-center gap-1">
                <Paperclip className="h-3 w-3" />
                <span>{task.attachments.length}</span>
              </div>
            )}
          </div>
        </div>

        {/* Assignee */}
        {assignee && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <Avatar className="h-6 w-6">
              <AvatarImage src={assignee.avatar_url} />
              <AvatarFallback className="text-xs">
                {assignee.full_name?.substring(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{assignee.full_name}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
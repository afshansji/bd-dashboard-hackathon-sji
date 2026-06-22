import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, UserPlus, Bell } from 'lucide-react';
import type { Notification } from '@/types/notifications';
import { useNavigate } from 'react-router-dom';
import { useMarkNotificationRead } from '@/hooks/useNotifications';

interface NotificationItemProps {
  notification: Notification;
  onClose?: () => void;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'TASK_MENTION':
      return MessageSquare;
    case 'TASK_ASSIGNEE_CHANGED':
      return UserPlus;
    default:
      return Bell;
  }
}

export function NotificationItem({ notification, onClose }: NotificationItemProps) {
  const navigate = useNavigate();
  const markAsRead = useMarkNotificationRead();
  const Icon = getNotificationIcon(notification.type);
  const actorName = notification.actor?.full_name || 'Someone';
  const actorInitials = actorName.substring(0, 2).toUpperCase();

  const handleClick = () => {
    // Mark as read if unread
    if (!notification.read_at) {
      markAsRead.mutate(notification.id);
    }

    // Navigate to the link
    if (notification.link_url) {
      navigate(notification.link_url);
    }

    // Close dropdown if provided
    if (onClose) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`
        flex gap-3 p-3 rounded-lg cursor-pointer transition-colors
        hover:bg-accent
        ${!notification.read_at ? 'bg-primary/5' : ''}
      `}
    >
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={notification.actor?.avatar_url} />
        <AvatarFallback className="text-xs">{actorInitials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium text-sm">{notification.title}</span>
          </div>
          {!notification.read_at && (
            <Badge variant="default" className="h-2 w-2 p-0 rounded-full" />
          )}
        </div>

        {notification.message && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-1">
            {notification.message}
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}


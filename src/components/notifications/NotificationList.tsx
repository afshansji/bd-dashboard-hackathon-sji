import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, CheckCheck, AlertCircle } from 'lucide-react';
import { useNotifications, useMarkAllNotificationsRead } from '@/hooks/useNotifications';
import { NotificationItem } from './NotificationItem';

interface NotificationListProps {
  onClose?: () => void;
}

export function NotificationList({ onClose }: NotificationListProps) {
  const { notifications, isLoading, error } = useNotifications(false);
  const markAllAsRead = useMarkAllNotificationsRead();
  const unreadNotifications = notifications.filter(n => !n.read_at);

  if (isLoading) {
    return (
      <div className="w-96 p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-96 p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error.message || 'Failed to load notifications. Please try again later.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="w-96 p-8 text-center">
        <Bell className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">
          You're all caught up!
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          No notifications yet
        </p>
      </div>
    );
  }

  return (
    <div className="w-96">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Notifications</h3>
        {unreadNotifications.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      <ScrollArea className="h-[400px]">
        <div className="p-2">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onClose={onClose}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}


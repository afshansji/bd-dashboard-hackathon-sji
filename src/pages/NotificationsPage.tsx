import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, CheckCheck, AlertCircle, Inbox } from 'lucide-react';
import { useNotifications, useMarkAllNotificationsRead } from '@/hooks/useNotifications';
import { NotificationItem } from '@/components/notifications/NotificationItem';

export default function NotificationsPage() {
  const { notifications: allNotifications, isLoading: allLoading, error: allError } = useNotifications(false);
  const { notifications: unreadNotifications, isLoading: unreadLoading } = useNotifications(true);
  const markAllAsRead = useMarkAllNotificationsRead();

  const renderNotificationList = (notifications: any[], isLoading: boolean, error: any) => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-3 p-4 border rounded-lg">
              <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
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
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error.message || 'Failed to load notifications. Please try again later.'}
          </AlertDescription>
        </Alert>
      );
    }

    if (notifications.length === 0) {
      return (
        <div className="text-center py-12">
          <Inbox className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-lg font-medium text-muted-foreground">
            No notifications
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            You're all caught up! Check back later for updates.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Notifications
          </h1>
          <p className="text-muted-foreground mt-1">
            Stay updated with your tasks, mentions, and assignments
          </p>
        </div>
        {unreadNotifications.length > 0 && (
          <Button
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Stats Card */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadNotifications.length}</div>
            <p className="text-xs text-muted-foreground">
              Require your attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allNotifications.length}</div>
            <p className="text-xs text-muted-foreground">
              Last 50 notifications
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Notifications List with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Your Notifications</CardTitle>
          <CardDescription>
            View and manage your notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="all" className="flex items-center gap-2">
                All
                {allNotifications.length > 0 && (
                  <span className="ml-1 text-xs bg-secondary px-2 py-0.5 rounded-full">
                    {allNotifications.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="unread" className="flex items-center gap-2">
                Unread
                {unreadNotifications.length > 0 && (
                  <span className="ml-1 text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full">
                    {unreadNotifications.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              {renderNotificationList(allNotifications, allLoading, allError)}
            </TabsContent>

            <TabsContent value="unread" className="mt-6">
              {renderNotificationList(unreadNotifications, unreadLoading, null)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

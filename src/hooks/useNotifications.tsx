import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
} from '@/services/notificationService';
import type { Notification } from '@/types/notifications';

export const useNotifications = (unreadOnly: boolean = false) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications = [], isLoading, error, refetch } = useQuery({
    queryKey: ['notifications', user?.id, unreadOnly],
    queryFn: async () => {
      if (!user?.id) return [];
      return await fetchNotifications(user.id, unreadOnly);
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });

  return {
    notifications,
    isLoading,
    error,
    refetch,
  };
};

export const useUnreadCount = () => {
  const { user } = useAuth();

  const { data: count = 0, isLoading, refetch } = useQuery({
    queryKey: ['notifications-unread-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      return await getUnreadCount(user.id);
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });

  return {
    count,
    isLoading,
    refetch,
  };
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      await markNotificationAsRead(notificationId);
    },
    onSuccess: () => {
      // Invalidate both notification queries
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to mark notification as read",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      await markAllNotificationsAsRead(user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      toast({
        title: "All notifications marked as read",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to mark all as read",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export type { Notification };


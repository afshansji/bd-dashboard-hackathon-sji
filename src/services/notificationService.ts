import { supabase } from '@/integrations/supabase/client';
import type { CreateNotificationData, Notification } from '@/types/notifications';
import { handleSupabaseError } from '@/utils/supabaseErrors';

/**
 * Create mention notifications for users mentioned in a comment
 */
export async function createMentionNotifications(
  commentId: string,
  taskId: string,
  taskTitle: string,
  mentionedUserIds: string[],
  actorId: string,
  commentPreview: string
): Promise<void> {
  // Don't notify the author
  const usersToNotify = Array.from(new Set(mentionedUserIds)).filter(id => id !== actorId);

  if (usersToNotify.length === 0) {
    return;
  }

  const notifications: CreateNotificationData[] = usersToNotify.map(userId => ({
    user_id: userId,
    type: 'TASK_MENTION',
    task_id: taskId,
    comment_id: commentId,
    actor_id: actorId,
    title: 'You were mentioned in a comment',
    message: `${taskTitle}: "${commentPreview.substring(0, 150)}${commentPreview.length > 150 ? '...' : ''}"`,
    link_url: `/bd/actions/tasks/${taskId}#comment-${commentId}`,
  }));

  try {
    // Use type assertion to work around missing table types
    const { error } = await (supabase as any)
      .from('user_notifications')
      .insert(notifications);

    if (error) {
      handleSupabaseError(error, 'user_notifications');
    }
  } catch (error) {
    console.error('Failed to create mention notifications:', error);
    throw error;
  }
}

/**
 * Create notification for assignee change
 */
export async function createAssigneeChangeNotification(
  taskId: string,
  taskTitle: string,
  oldAssigneeId: string | null,
  newAssigneeId: string | null,
  actorId: string
): Promise<void> {
  // Only notify if there's a new assignee and it's not the person making the change
  if (!newAssigneeId || newAssigneeId === actorId || newAssigneeId === oldAssigneeId) {
    return;
  }

  const notification: CreateNotificationData = {
    user_id: newAssigneeId,
    type: 'TASK_ASSIGNEE_CHANGED',
    task_id: taskId,
    actor_id: actorId,
    title: 'You were assigned a task',
    message: `You have been assigned to: ${taskTitle}`,
    link_url: `/bd/actions/tasks/${taskId}`,
  };

  try {
    // Use type assertion
    const { error } = await (supabase as any)
      .from('user_notifications')
      .insert(notification);

    if (error) {
      handleSupabaseError(error, 'user_notifications');
    }
  } catch (error) {
    console.error('Failed to create assignee notification:', error);
    throw error;
  }
}

/**
 * Fetch user notifications
 */
export async function fetchNotifications(
  userId: string,
  unreadOnly: boolean = false
): Promise<Notification[]> {
  try {
    let query = supabase
      .from('user_notifications')
      .select(`
        *,
        actor:profiles!actor_id(
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (unreadOnly) {
      query = query.is('read_at', null);
    }

    const { data, error } = await query;

    if (error) {
      handleSupabaseError(error, 'user_notifications');
    }

    return (data || []) as Notification[];
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    throw error;
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    // Use type assertion
    const { error } = await (supabase as any)
      .from('user_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) {
      handleSupabaseError(error, 'user_notifications');
    }
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  try {
    // Use type assertion
    const { error } = await (supabase as any)
      .from('user_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);

    if (error) {
      handleSupabaseError(error, 'user_notifications');
    }
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    throw error;
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    // Use type assertion
    const { count, error } = await (supabase as any)
      .from('user_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);

    if (error) {
      handleSupabaseError(error, 'user_notifications');
    }

    return count || 0;
  } catch (error) {
    console.error('Failed to get unread count:', error);
    return 0;
  }
}

/**
 * Delete old read notifications (cleanup)
 */
export async function deleteOldNotifications(userId: string, daysOld: number = 30): Promise<void> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // Use type assertion
    const { error } = await (supabase as any)
      .from('user_notifications')
      .delete()
      .eq('user_id', userId)
      .not('read_at', 'is', null)
      .lt('read_at', cutoffDate.toISOString());

    if (error) {
      handleSupabaseError(error, 'user_notifications');
    }
  } catch (error) {
    console.error('Failed to delete old notifications:', error);
    // Don't throw, this is a cleanup operation
  }
}

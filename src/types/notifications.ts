export type NotificationType = 
  | 'TASK_MENTION' 
  | 'TASK_ASSIGNEE_CHANGED' 
  | 'TASK_STATUS_CHANGED'
  | 'TASK_COMMENT_ADDED';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  task_id?: string;
  comment_id?: string;
  actor_id?: string;
  title: string;
  message?: string;
  link_url?: string;
  read_at?: string;
  created_at: string;
  actor?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export interface CreateNotificationData {
  user_id: string;
  type: NotificationType;
  task_id?: string;
  comment_id?: string;
  actor_id?: string;
  title: string;
  message?: string;
  link_url?: string;
}


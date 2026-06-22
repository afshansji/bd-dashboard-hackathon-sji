export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  body_text: string;
  created_at: string;
  updated_at: string;
  edited: boolean;
  author?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  mentions?: TaskCommentMention[];
}

export interface TaskCommentMention {
  id: string;
  comment_id: string;
  mentioned_user_id: string;
  created_at: string;
}

export interface CreateCommentData {
  task_id: string;
  body_text: string;
  mentioned_user_ids: string[];
}


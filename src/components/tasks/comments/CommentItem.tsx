import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { Edit2, Trash2, X, Check } from 'lucide-react';
import type { TaskComment } from '@/types/comments';
import { MentionText } from './MentionText';
import { SafeHtmlContent } from './SafeHtmlContent';
import { RichTextEditor } from './RichTextEditor';
import { useAuth } from '@/hooks/useAuth';

interface CommentItemProps {
  comment: TaskComment;
  onUpdate?: (commentId: string, newText: string) => void;
  onDelete?: (commentId: string) => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

export function CommentItem({ comment, onUpdate, onDelete, isUpdating = false, isDeleting = false }: CommentItemProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editHtml, setEditHtml] = useState('');

  const authorName = comment.author?.full_name || comment.author?.email || 'Unknown User';
  const authorInitials = authorName.substring(0, 2).toUpperCase();
  const isOwnComment = user?.id === comment.author_id;

  // Check if comment is within 1 hour of creation
  const createdTime = new Date(comment.created_at);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const canDelete = isOwnComment && createdTime > oneHourAgo;

  // Detect if content is HTML or plain text
  const isHtmlContent = (text: string): boolean => {
    return /<[a-z][\s\S]*>/i.test(text);
  };

  const handleStartEdit = () => {
    // Set the content for editing - preserves HTML or plain text
    setEditHtml(comment.body_text);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditHtml('');
  };

  const handleSaveEdit = () => {
    // Get text content to validate
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = editHtml;
    const textContent = (tempDiv.textContent || tempDiv.innerText || '').trim();

    if (onUpdate && textContent && editHtml !== comment.body_text) {
      onUpdate(comment.id, editHtml);
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (onDelete && canDelete) {
      onDelete(comment.id);
    }
  };

  return (
    <div className="flex gap-3 py-4" id={`comment-${comment.id}`}>
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={comment.author?.avatar_url} />
        <AvatarFallback className="text-xs">{authorInitials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{authorName}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
          {comment.edited && (
            <span className="text-xs text-muted-foreground italic">(edited)</span>
          )}
          {!isEditing && isOwnComment && (
            <div className="flex gap-1.5 ml-auto items-center">
              {onUpdate && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-blue-50 dark:hover:bg-blue-950"
                  onClick={handleStartEdit}
                  title="Edit comment"
                >
                  <Edit2 className="h-4 w-4 text-blue-600" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 w-8 p-0 ${
                    canDelete
                      ? 'hover:bg-red-50 dark:hover:bg-red-950'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  onClick={handleDelete}
                  disabled={!canDelete || isDeleting}
                  title={canDelete ? "Delete comment (within 1 hour)" : "Can only delete within 1 hour"}
                >
                  <Trash2 className={`h-4 w-4 ${
                    canDelete
                      ? 'text-red-600'
                      : 'text-muted-foreground/50'
                  }`} />
                </Button>
              )}
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <RichTextEditor
              value={editHtml}
              onChange={setEditHtml}
              placeholder="Edit your comment..."
              disabled={isUpdating}
              maxLength={4000}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Use the toolbar to format text. Press Esc to cancel.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isUpdating}
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={isUpdating || editHtml === comment.body_text}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Save
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-foreground overflow-hidden">
            {isHtmlContent(comment.body_text) ? (
              <SafeHtmlContent html={comment.body_text} />
            ) : (
              <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                <MentionText text={comment.body_text} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

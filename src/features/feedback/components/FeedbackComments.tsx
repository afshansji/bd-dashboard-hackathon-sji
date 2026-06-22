import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle } from "lucide-react";
import type { FeedbackComment } from "../api";

interface FeedbackCommentsProps {
  comments: FeedbackComment[];
  onAddComment: (comment: string) => void;
  canComment?: boolean;
  isPosting?: boolean;
}

export function FeedbackComments({
  comments,
  onAddComment,
  canComment = true,
  isPosting = false,
}: FeedbackCommentsProps) {
  const [commentDraft, setCommentDraft] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!commentDraft.trim()) return;
    onAddComment(commentDraft.trim());
    setCommentDraft("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <MessageCircle className="h-5 w-5" /> Conversation
        </CardTitle>
        <CardDescription>
          Respond to the reporter and leave internal notes for the team.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No comments yet. Start the discussion below.
            </p>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="rounded-lg border border-border bg-muted/40 p-4"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{comment.author_name ?? comment.author_email ?? "Comment"}</span>
                  <span>{new Date(comment.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-sm text-foreground whitespace-pre-line">
                  {comment.comment}
                </p>
              </div>
            ))
          )}
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <Textarea
            placeholder={
              canComment
                ? "Leave a note for the team or reply to the reporter"
                : "Comments are disabled"
            }
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value)}
            rows={4}
            disabled={!canComment || isPosting}
          />
          <div className="flex items-center justify-end gap-2">
            <Button type="submit" disabled={isPosting || !canComment || !commentDraft.trim()}>
              {isPosting ? "Posting…" : "Add comment"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

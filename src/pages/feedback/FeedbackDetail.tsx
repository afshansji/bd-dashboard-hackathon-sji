import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { ArrowLeft } from "lucide-react";
import {
  addFeedbackUpvote,
  deleteFeedback,
  getFeedbackDetail,
  postFeedbackComment,
  removeFeedbackUpvote,
  updateFeedbackModule,
  updateFeedbackPriority,
  updateFeedbackStatus,
  type FeedbackPriority,
  type FeedbackStatus,
} from "@/features/feedback/api";
import { FeedbackBreadcrumb } from "@/features/feedback/components/FeedbackBreadcrumb";
import { FeedbackDetailCard } from "@/features/feedback/components/FeedbackDetailCard";
import { FeedbackComments } from "@/features/feedback/components/FeedbackComments";
import { UpvoteButton } from "@/components/feedback/UpvoteButton";

export default function FeedbackDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { enabled: feedbackEnabled } = useFeatureFlag("feedback_enabled");

  // Any authenticated user can update status and comment (internal portal)
  const canEdit = !!user;
  const canArchive = user?.role === "super_admin";

  const detailQuery = useQuery({
    queryKey: ["feedback-detail", id],
    queryFn: () => getFeedbackDetail(id!),
    enabled: feedbackEnabled && !!id,
  });

  const commentMutation = useMutation({
    mutationFn: (message: string) => postFeedbackComment(id!, message),
    onSuccess: () => {
      toast({ title: "Comment posted", description: "Your reply has been added." });
      queryClient.invalidateQueries({ queryKey: ["feedback-detail", id] });
    },
    onError: (error) => {
      toast({
        title: "Unable to add comment",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: FeedbackStatus) => updateFeedbackStatus(id!, status),
    onSuccess: (updated) => {
      toast({
        title: "Status updated",
        description: `Feedback is now marked as ${updated.status}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["feedback-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["feedback-dashboard"] });
    },
    onError: (error) => {
      toast({
        title: "Unable to update status",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const priorityMutation = useMutation({
    mutationFn: (priority: FeedbackPriority | null) => updateFeedbackPriority(id!, priority),
    onSuccess: (updated) => {
      toast({
        title: "Priority updated",
        description: `Priority set to ${updated.priority ?? "none"}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["feedback-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["feedback-dashboard"] });
    },
    onError: (error) => {
      toast({
        title: "Unable to update priority",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const moduleMutation = useMutation({
    mutationFn: (moduleValue: string | null) => updateFeedbackModule(id!, moduleValue),
    onSuccess: () => {
      toast({
        title: "Module updated",
        description: "Feedback categorization has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["feedback-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["feedback-dashboard"] });
    },
    onError: (error) => {
      toast({
        title: "Unable to update module",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const upvoteMutation = useMutation({
    mutationFn: (shouldUpvote: boolean) =>
      shouldUpvote ? addFeedbackUpvote(id!) : removeFeedbackUpvote(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["feedback-dashboard"] });
    },
    onError: (error) => {
      toast({
        title: "Unable to update upvote",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteFeedback(id!),
    onSuccess: () => {
      toast({ title: "Feedback archived", description: "The item was closed." });
      queryClient.invalidateQueries({ queryKey: ["feedback-dashboard"] });
      navigate("/feedback");
    },
    onError: (error) => {
      toast({
        title: "Unable to archive feedback",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  if (!feedbackEnabled) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Feedback module is disabled.
      </div>
    );
  }

  if (detailQuery.isLoading) {
    return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  }

  if (!detailQuery.data?.feedback) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground mb-4">Feedback not found.</p>
        <Button variant="outline" onClick={() => navigate("/feedback")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Feedback
        </Button>
      </div>
    );
  }

  const { feedback, comments, attachment_signed_url, attachments, has_upvoted } = detailQuery.data;
  const isUpdating = statusMutation.isPending || priorityMutation.isPending || moduleMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/feedback")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <FeedbackBreadcrumb
          parentLabel="Feedback"
          parentPath="/feedback"
          currentLabel={feedback.subject}
          type={feedback.type}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,1.2fr]">
        <FeedbackDetailCard
          feedback={feedback}
          attachments={attachments}
          legacyAttachmentUrl={attachment_signed_url}
          canEditStatus={canEdit}
          canEditPriority={canEdit}
          canEditModule={canEdit}
          canArchive={canArchive}
          headerActions={(
            <UpvoteButton
              count={feedback.upvote_count ?? 0}
              hasUpvoted={!!has_upvoted}
              disabled={upvoteMutation.isPending}
              onToggle={(next) => upvoteMutation.mutate(next)}
            />
          )}
          onStatusChange={(status) => statusMutation.mutate(status)}
          onPriorityChange={(priority) => priorityMutation.mutate(priority)}
          onModuleChange={(moduleValue) => moduleMutation.mutate(moduleValue)}
          onArchive={() => deleteMutation.mutate()}
          isUpdating={isUpdating}
        />

        <FeedbackComments
          comments={comments}
          onAddComment={(comment) => commentMutation.mutate(comment)}
          canComment={canEdit}
          isPosting={commentMutation.isPending}
        />
      </div>
    </div>
  );
}

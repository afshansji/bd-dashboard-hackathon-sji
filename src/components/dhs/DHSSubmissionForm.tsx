import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useSubmitDHS, useUpdateDHS, useTodayDHSSubmission } from "@/hooks/useDHSSubmissions";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, CheckCircle2, Edit2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import RichTextEditor from "@/components/rich-text/RichTextEditor";

export function DHSSubmissionForm() {
  const { user } = useAuth();
  const submitDHS = useSubmitDHS();
  const updateDHS = useUpdateDHS();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState<string>('');

  // Check if user has already submitted DHS for today
  const { data: todaySubmission, isLoading: isCheckingSubmission } = useTodayDHSSubmission(user?.id);

  const hasSubmittedToday = !!todaySubmission;

  // Load existing submission data when in edit mode
  useEffect(() => {
    if (todaySubmission && isEditing) {
      setContent(todaySubmission.content || '');
    }
  }, [todaySubmission, isEditing]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast.error("You must be logged in to submit DHS");
      return;
    }

    // Validate content is not empty
    const textContent = content.replace(/<[^>]*>/g, '').trim();
    if (!textContent) {
      toast.error("Please provide your DHS update");
      return;
    }

    setIsSubmitting(true);
    try {
      if (hasSubmittedToday && todaySubmission) {
        // Update existing submission
        await updateDHS.mutateAsync({
          id: todaySubmission.id,
          updates: { content },
        });
        toast.success("DHS updated successfully");
        setIsEditing(false);
      } else {
        // Create new submission
        await submitDHS.mutateAsync({
          date: new Date().toISOString().split('T')[0],
          content,
        });
        toast.success("DHS submitted successfully");
        setContent('');
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to submit DHS");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setContent('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Head Start</CardTitle>
        <CardDescription>
          Share your daily BD update and plan for the day
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isCheckingSubmission ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : hasSubmittedToday && !isEditing ? (
          <div className="space-y-4">
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <AlertTitle className="text-green-900">DHS Already Submitted</AlertTitle>
              <AlertDescription className="text-green-800">
                You have already submitted your Daily Head Start for today. You can edit it throughout the day if needed.
              </AlertDescription>
            </Alert>
            <Button onClick={handleEdit} variant="outline" className="w-full">
              <Edit2 className="mr-2 h-4 w-4" />
              Edit Today's Submission
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="content">Daily Update</Label>
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Share your daily update: What are you working on today? Any wins, challenges, or support needed?"
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Use the toolbar to format your update with bold, italic, lists, and links.
              </p>
            </div>

            <div className="flex gap-2">
              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Saving..." : isEditing ? "Update DHS" : "Submit DHS"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}


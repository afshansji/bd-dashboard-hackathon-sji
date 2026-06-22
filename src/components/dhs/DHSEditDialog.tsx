import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUpdateDHS } from "@/hooks/useDHSSubmissions";
import { Loader2 } from "lucide-react";
import RichTextEditor from "@/components/rich-text/RichTextEditor";

interface DHSEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: {
    id: string;
    content?: string | null;
  };
}

export function DHSEditDialog({ open, onOpenChange, submission }: DHSEditDialogProps) {
  const updateDHS = useUpdateDHS();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [content, setContent] = useState<string>(submission.content || '');

  useEffect(() => {
    setContent(submission.content || '');
  }, [submission.content]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate content is not empty
    const textContent = content.replace(/<[^>]*>/g, '').trim();
    if (!textContent) {
      toast.error("Please provide your DHS update");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateDHS.mutateAsync({
        id: submission.id,
        updates: { content },
      });

      toast.success("DHS updated successfully");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update DHS");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit DHS Submission</DialogTitle>
          <DialogDescription>
            Update your Daily Head Start
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content">Daily Update</Label>
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="Share your daily update: What are you working on today? Any wins, challenges, or support needed?"
              className="w-full"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


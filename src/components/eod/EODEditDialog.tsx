import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUpdateEOD } from "@/hooks/useTeamSummaries";
import { Loader2 } from "lucide-react";

const eodEditSchema = z.object({
  tasks_completed: z.string().min(1, "Please describe tasks completed"),
  tomorrow_plan: z.string().optional(),
  challenges: z.string().optional(),
  hours_worked: z.string().optional(),
});

type EODEditFormValues = z.infer<typeof eodEditSchema>;

interface EODEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: {
    id: string;
    tasks_completed: string;
    tomorrow_plan?: string | null;
    challenges?: string | null;
    hours_worked?: number | null;
  };
}

export function EODEditDialog({ open, onOpenChange, submission }: EODEditDialogProps) {
  const updateEOD = useUpdateEOD();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EODEditFormValues>({
    resolver: zodResolver(eodEditSchema),
    defaultValues: {
      tasks_completed: submission.tasks_completed || "",
      tomorrow_plan: submission.tomorrow_plan || "",
      challenges: submission.challenges || "",
      hours_worked: submission.hours_worked?.toString() || "",
    },
  });

  const onSubmit = async (values: EODEditFormValues) => {
    setIsSubmitting(true);
    try {
      await updateEOD.mutateAsync({
        id: submission.id,
        updates: {
          tasks_completed: values.tasks_completed,
          tomorrow_plan: values.tomorrow_plan || null,
          challenges: values.challenges || null,
          hours_worked: values.hours_worked ? parseFloat(values.hours_worked) : null,
        },
      });

      toast.success("EOD updated successfully");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update EOD");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit EOD Submission</DialogTitle>
          <DialogDescription>
            Make changes to your end of day submission
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tasks_completed">Tasks Completed Today *</Label>
            <Textarea
              id="tasks_completed"
              placeholder="Describe what you accomplished today..."
              className="min-h-[100px]"
              {...register("tasks_completed")}
            />
            {errors.tasks_completed && (
              <p className="text-sm text-destructive">{errors.tasks_completed.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tomorrow_plan">Plan for Tomorrow</Label>
            <Textarea
              id="tomorrow_plan"
              placeholder="What do you plan to work on tomorrow?"
              className="min-h-[80px]"
              {...register("tomorrow_plan")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="challenges">Challenges or Blockers</Label>
            <Textarea
              id="challenges"
              placeholder="Any issues or blockers you encountered?"
              className="min-h-[80px]"
              {...register("challenges")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hours_worked">Hours Worked</Label>
            <Input
              id="hours_worked"
              type="number"
              step="0.5"
              placeholder="8"
              {...register("hours_worked")}
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

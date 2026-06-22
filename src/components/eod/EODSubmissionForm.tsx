import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSubmitEOD, useEODSubmissions } from "@/hooks/useTeamSummaries";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const eodFormSchema = z.object({
  tasks_completed: z.string().min(1, "Please describe tasks completed"),
  tomorrow_plan: z.string().optional(),
  challenges: z.string().optional(),
  hours_worked: z.string().optional(),
});

type EODFormValues = z.infer<typeof eodFormSchema>;

export function EODSubmissionForm() {
  const { user } = useAuth();
  const submitEOD = useSubmitEOD();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user has already submitted EOD for today
  const { data: todaySubmissions, isLoading: isCheckingSubmission } = useEODSubmissions(
    user?.id,
    new Date()
  );

  const hasSubmittedToday = todaySubmissions && todaySubmissions.length > 0;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EODFormValues>({
    resolver: zodResolver(eodFormSchema),
  });

  const onSubmit = async (values: EODFormValues) => {
    if (!user?.id) {
      toast.error("You must be logged in to submit EOD");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitEOD.mutateAsync({
        date: new Date().toISOString().split('T')[0],
        tasks_completed: values.tasks_completed,
        tomorrow_plan: values.tomorrow_plan || null,
        challenges: values.challenges || null,
        hours_worked: values.hours_worked ? parseFloat(values.hours_worked) : null,
      });

      toast.success("EOD submission saved successfully");
      reset();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit EOD");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>End of Day Submission</CardTitle>
        <CardDescription>
          Submit your daily work summary
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isCheckingSubmission ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : hasSubmittedToday ? (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <AlertTitle className="text-green-900">EOD Already Submitted</AlertTitle>
            <AlertDescription className="text-green-800">
              You have already submitted your End of Day report for today. Thank you for your submission!
            </AlertDescription>
          </Alert>
        ) : (
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

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Submitting..." : "Submit EOD"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { useBDTeamMembers } from "@/hooks/useBDTeamMembers";
import { useTaskLabelAssociations } from "@/hooks/useTaskLabels";
import { useTaskAttachments } from "@/hooks/useTaskAttachments";
import { recordTaskHistory, recordTaskCreation } from "@/services/taskHistoryService";
import { createAssigneeChangeNotification } from "@/services/notificationService";
import { CampaignAssociationField } from "./CampaignAssociationField";
import { TaskLabelsField } from "./TaskLabelsField";
import { GoogleFolderField } from "./GoogleFolderField";
import { TaskAttachmentsField } from "./TaskAttachmentsField";
import { OptionalLinksSection } from "./OptionalLinksSection";
import type { GoogleFolder } from "@/hooks/useProjectTasks";

// URL validation helper
const urlSchema = z.string().optional().nullable().refine(
  (val) => {
    if (!val || val.trim() === "") return true;
    try {
      new URL(val.startsWith('http') ? val : `https://${val}`);
      return true;
    } catch {
      return false;
    }
  },
  { message: "Please enter a valid URL" }
);

const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "review", "completed", "blocked"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  category: z.enum(["ideas", "discussion", "work", "other"]).default("work"),
  project_id: z.string().optional(),
  assigned_to: z.string().nullable().optional(),
  due_date: z.string().optional(),
  estimated_hours: z.string().optional(),
  // New enhanced fields
  is_campaign_associated: z.boolean().default(false),
  campaign_id: z.string().nullable().optional(),
  label_ids: z.array(z.string()).default([]),
  google_folder: z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    url: z.string().optional(),
  }).nullable().optional().transform((val) => {
    // Transform to ensure id is present if object exists
    if (val && val.id) return val as { id: string; name?: string; url?: string };
    return null;
  }),
  active_collab_link: urlSchema,
  workboard_ai_link: urlSchema,
  reference_url: urlSchema,
}).refine((data) => {
  // If campaign associated, campaign_id is required
  if (data.is_campaign_associated && !data.campaign_id) {
    return false;
  }
  return true;
}, {
  message: "Campaign selection is required when associated with a campaign",
  path: ["campaign_id"],
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: any;
}

export function TaskForm({ open, onOpenChange, task }: TaskFormProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);

  const { data: bdMembers = [], isLoading: isLoadingMembers, error: membersError } = useBDTeamMembers();
  const { associateLabelsAsync } = useTaskLabelAssociations(task?.id);
  const { uploadAttachmentAsync } = useTaskAttachments(task?.id);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      category: "work",
      project_id: "",
      assigned_to: null,
      due_date: "",
      estimated_hours: "",
      is_campaign_associated: false,
      campaign_id: null,
      label_ids: [],
      google_folder: null,
      active_collab_link: null,
      workboard_ai_link: null,
      reference_url: null,
    },
  });

  const lastInitialTaskId = useRef<string | null>(null);
  const initializedForm = useRef(false);
  const currentUserId = user?.id ?? null;

  useEffect(() => {
    if (!open) {
      initializedForm.current = false;
      lastInitialTaskId.current = null;
      return;
    }

    const currentTaskId = task?.id ?? null;

    if (initializedForm.current && lastInitialTaskId.current === currentTaskId) {
      return;
    }

    initializedForm.current = true;
    lastInitialTaskId.current = currentTaskId;

    if (task) {
      form.reset({
        title: task.title || "",
        description: task.description || "",
        status: task.status || "todo",
        priority: task.priority || "medium",
        category: task.category || "work",
        project_id: task.project_id || "",
        assigned_to: task.assigned_to || null,
        due_date: task.due_date || "",
        estimated_hours: task.estimated_hours?.toString() || "",
        is_campaign_associated: task.is_campaign_associated || false,
        campaign_id: task.campaign_id || null,
        label_ids: task.labels?.map((l: any) => l.id) || [],
        google_folder: task.google_folder || null,
        active_collab_link: task.active_collab_link || null,
        workboard_ai_link: task.workboard_ai_link || null,
        reference_url: task.reference_url || null,
      });
      setAttachmentFiles([]); // Reset attachments for edit mode
    } else {
      form.reset({
        title: "",
        description: "",
        status: "todo",
        priority: "medium",
        category: "work",
        project_id: "",
        assigned_to: currentUserId,
        due_date: "",
        estimated_hours: "",
        is_campaign_associated: false,
        campaign_id: null,
        label_ids: [],
        google_folder: null,
        active_collab_link: null,
        workboard_ai_link: null,
        reference_url: null,
      });
      setAttachmentFiles([]);
    }
  }, [open, task, form, currentUserId]);

  const onSubmit = async (values: TaskFormValues) => {
    // Prevent submit if attachments are being uploaded
    if (uploadingAttachments) {
      toast.error("Please wait for attachments to finish uploading");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: values.title,
        description: values.description,
        status: values.status,
        priority: values.priority,
        category: values.category,
        project_id: values.project_id || null,
        assigned_to: values.assigned_to || null,
        due_date: values.due_date || null,
        estimated_hours: values.estimated_hours ? parseFloat(values.estimated_hours) : null,
        created_by: user?.id,
        // New enhanced fields
        is_campaign_associated: values.is_campaign_associated,
        campaign_id: values.campaign_id || null,
        google_folder: values.google_folder || null,
        active_collab_link: values.active_collab_link || null,
        workboard_ai_link: values.workboard_ai_link || null,
        reference_url: values.reference_url || null,
      };

      let taskId: string;
      const oldTask = task ? { ...task } : null;

      if (task) {
        // Update existing task
        const { error } = await supabase
          .from("project_tasks")
          .update(payload)
          .eq("id", task.id);

        if (error) throw error;
        taskId = task.id;

        // Record history for task updates
        if (user?.id && oldTask) {
          try {
            await recordTaskHistory(taskId, oldTask, payload, user.id);
            
            // Check if assignee changed and create notification
            if (oldTask.assigned_to !== values.assigned_to) {
              await createAssigneeChangeNotification(
                taskId,
                values.title,
                oldTask.assigned_to || null,
                values.assigned_to || null,
                user.id
              );
            }
          } catch (historyError) {
            console.error('Failed to record history:', historyError);
            // Don't fail the task update if history recording fails
          }
        }

        toast.success("Task updated successfully");
      } else {
        // Create new task
        const { data, error } = await supabase
          .from("project_tasks")
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        if (!data) throw new Error("Failed to create task");
        
        taskId = data.id;

        // Record task creation in history
        if (user?.id) {
          try {
            await recordTaskCreation(taskId, user.id);
          } catch (historyError) {
            console.error('Failed to record creation:', historyError);
          }
        }

        toast.success("Task created successfully");
      }

      // Associate labels
      if (values.label_ids.length > 0) {
        await associateLabelsAsync({ taskId, labelIds: values.label_ids });
      }

      // Upload attachments (only for new files)
      if (attachmentFiles.length > 0) {
        setUploadingAttachments(true);
        const uploadPromises = attachmentFiles.map(file => 
          uploadAttachmentAsync({ taskId, file })
        );
        
        try {
          await Promise.all(uploadPromises);
        } catch (uploadError) {
          console.error("Some attachments failed to upload:", uploadError);
          toast.error("Some attachments failed to upload");
        } finally {
          setUploadingAttachments(false);
        }
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["all-project-tasks"] });
      
      onOpenChange(false);
      form.reset();
      setAttachmentFiles([]);
    } catch (error: any) {
      console.error("Task save error:", error);
      toast.error(error.message || "Failed to save task");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "Create New Task"}</DialogTitle>
          <DialogDescription>
            {task ? "Update task details" : "Fill in the details to create a new task"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-200px)] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Enter task title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter task description"
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campaign Association */}
              <CampaignAssociationField form={form} />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="todo">To Do</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="review">In Review</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="blocked">Blocked</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stream</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select stream" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="work">Work</SelectItem>
                        <SelectItem value="ideas">Ideas</SelectItem>
                        <SelectItem value="discussion">Discussion</SelectItem>
                        <SelectItem value="other">Others</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Assignee Field with All Users */}
              <FormField
                control={form.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignee</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        // Translate "unassigned" string to null before saving
                        field.onChange(value === "unassigned" ? null : value);
                      }}
                      value={field.value || "unassigned"}
                      disabled={isLoadingMembers}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              isLoadingMembers
                                ? "Loading users..."
                                : membersError
                                ? "Error loading users"
                                : "Select assignee"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {isLoadingMembers ? (
                          <SelectItem value="loading" disabled>Loading users...</SelectItem>
                        ) : membersError ? (
                          <SelectItem value="error" disabled>Failed to load users</SelectItem>
                        ) : bdMembers.length === 0 ? (
                          <SelectItem value="empty" disabled>No users found</SelectItem>
                        ) : (
                          bdMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.full_name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {membersError && (
                      <p className="text-sm text-destructive mt-1">
                        Error loading users: {membersError.message}
                      </p>
                    )}
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estimated_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Hours</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.5" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Labels */}
              <TaskLabelsField form={form} />

              {/* Google Folder */}
              <GoogleFolderField form={form} />

              {/* Attachments */}
              <TaskAttachmentsField 
                attachments={attachmentFiles}
                onAttachmentsChange={setAttachmentFiles}
              />

              {/* Optional Links */}
              <OptionalLinksSection form={form} />

              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting || uploadingAttachments}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || uploadingAttachments}
                >
                  {isSubmitting ? "Saving..." : uploadingAttachments ? "Uploading..." : task ? "Update Task" : "Create Task"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

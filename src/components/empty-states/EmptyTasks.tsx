import { ListTodo } from "lucide-react";
import { EmptyState } from "./EmptyState";

interface EmptyTasksProps {
  onCreateTask?: () => void;
  onSyncHours?: () => void;
}

export function EmptyTasks({ onCreateTask, onSyncHours }: EmptyTasksProps) {
  return (
    <EmptyState
      icon={ListTodo}
      title="No Tasks"
      description="Add tasks to track work, collaborate with your team, and stay organized across projects."
      primaryAction={
        onCreateTask
          ? {
              label: "Create Task",
              onClick: onCreateTask,
            }
          : undefined
      }
      secondaryAction={
        onSyncHours
          ? {
              label: "Sync Hours",
              onClick: onSyncHours,
              variant: "ghost",
            }
          : undefined
      }
    />
  );
}

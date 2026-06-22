import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ListTodo, Plus } from "lucide-react";

interface EmptyTasksProps {
  onCreateTask: () => void;
}

export function EmptyTasks({ onCreateTask }: EmptyTasksProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-muted p-4 mb-4">
          <ListTodo className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
        <p className="text-muted-foreground text-center mb-4 max-w-sm">
          Create your first task to start tracking work for this campaign.
        </p>
        <Button onClick={onCreateTask}>
          <Plus className="h-4 w-4 mr-2" />
          Create Task
        </Button>
      </CardContent>
    </Card>
  );
}

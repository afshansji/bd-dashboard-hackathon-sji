import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, ListTodo } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCampaignTasks } from '@/hooks/useCampaignTasks';
import { useCampaignBySlug } from '@/hooks/useCampaignBySlug';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskForm } from '@/components/tasks/TaskForm';
import { EmptyTasks } from '@/components/tasks/EmptyTasks';
import type { ProjectTask } from '@/hooks/useProjectTasks';

export default function CampaignTasksPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: campaignData, isLoading: campaignLoading } = useCampaignBySlug(slug || '');
  const campaign = campaignData?.campaign;
  const { data: tasks, isLoading: tasksLoading, error } = useCampaignTasks(campaign?.id);
  const [showTaskForm, setShowTaskForm] = useState(false);

  if (campaignLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading campaign...</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="text-destructive">Campaign not found</div>
        <Button asChild className="mt-4">
          <Link to="/campaigns">Back to Outreach</Link>
        </Button>
      </div>
    );
  }

  // Cast tasks to proper type
  const typedTasks = (tasks || []) as unknown as ProjectTask[];

  const tasksByCategory = {
    ideas: typedTasks.filter((t) => t.category === 'ideas'),
    discussion: typedTasks.filter((t) => t.category === 'discussion'),
    work: typedTasks.filter((t) => t.category === 'work' || !t.category),
    other: typedTasks.filter((t) => t.category === 'other'),
  };

  const totalTasks = typedTasks.length;
  const completedTasks = typedTasks.filter((t) => t.status === 'completed').length;
  const inProgressTasks = typedTasks.filter((t) => t.status === 'in_progress').length;
  const blockedTasks = typedTasks.filter((t) => t.status === 'blocked').length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/campaigns/${slug}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Campaign
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Outreach Tasks</h1>
            <p className="text-muted-foreground">{campaign.name}</p>
          </div>
        </div>
        <Button onClick={() => setShowTaskForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Task Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-600">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-600">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressTasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-600">Blocked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{blockedTasks}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks by Category */}
      {tasksLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading tasks...</div>
      ) : error ? (
        <div className="text-center text-destructive py-12">Error loading tasks</div>
      ) : totalTasks === 0 ? (
        <EmptyTasks onCreateTask={() => setShowTaskForm(true)} />
      ) : (
        <div className="space-y-8">
          {/* Ideas */}
          {tasksByCategory.ideas.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-500" />
                Ideas ({tasksByCategory.ideas.length})
              </h2>
              <div className="grid gap-4">
                {tasksByCategory.ideas.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}

          {/* Discussion */}
          {tasksByCategory.discussion.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                Discussion ({tasksByCategory.discussion.length})
              </h2>
              <div className="grid gap-4">
                {tasksByCategory.discussion.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}

          {/* Work */}
          {tasksByCategory.work.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                Work ({tasksByCategory.work.length})
              </h2>
              <div className="grid gap-4">
                {tasksByCategory.work.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}

          {/* Other */}
          {tasksByCategory.other.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-gray-500" />
                Other ({tasksByCategory.other.length})
              </h2>
              <div className="grid gap-4">
                {tasksByCategory.other.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Task Form Dialog */}
      <TaskForm
        open={showTaskForm}
        onOpenChange={setShowTaskForm}
        task={null}
      />
    </div>
  );
}

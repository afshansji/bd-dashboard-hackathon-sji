import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Settings, Lightbulb, MessageSquare, Briefcase, MoreHorizontal, Brain, CalendarCheck } from 'lucide-react';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskForm } from '@/components/tasks/TaskForm';
import { useMyProjectTasks, useDelegatedProjectTasks, ProjectTask } from '@/hooks/useProjectTasks';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, isWithinInterval, isBefore } from 'date-fns';
import { usePagination } from '@/hooks/usePagination';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

const tabDefinitions = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'delegated', label: 'Delegated' },
  { value: 'all', label: 'All Tasks' },
  { value: 'streams', label: 'Streams' },
] as const;

const streamDefinitions = [
  { value: 'ideas', label: 'Ideas', icon: Lightbulb },
  { value: 'discussion', label: 'Discussion', icon: MessageSquare },
  { value: 'work', label: 'Work', icon: Briefcase },
  { value: 'other', label: 'Others', icon: MoreHorizontal },
] as const;

type TabValue = (typeof tabDefinitions)[number]['value'];
type StreamValue = (typeof streamDefinitions)[number]['value'];

const parseDueDate = (task: ProjectTask) => {
  if (!task.due_date) return null;
  const parsed = new Date(task.due_date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const MyTasksPage = () => {
  const { data: tasks = [], isLoading, error } = useMyProjectTasks();
  const { data: delegatedTasks = [], isLoading: delegatedLoading, error: delegatedError } = useDelegatedProjectTasks();
  const [activeTab, setActiveTab] = useState<TabValue>('today');
  const [activeStream, setActiveStream] = useState<StreamValue>('ideas');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
  const pagination = usePagination(10);

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);

  const tasksWithDueDate = useMemo(
    () =>
      tasks.map((task) => ({
        task,
        dueDate: parseDueDate(task),
      })),
    [tasks],
  );

  const todayTasks = useMemo(
    () =>
      tasksWithDueDate
        .filter(({ dueDate }) => dueDate && isWithinInterval(dueDate, { start: todayStart, end: todayEnd }))
        .map(({ task }) => task),
    [tasksWithDueDate, todayStart, todayEnd],
  );

  const weekTasks = useMemo(
    () =>
      tasksWithDueDate
        .filter(({ dueDate }) => dueDate && isWithinInterval(dueDate, { start: weekStart, end: weekEnd }))
        .map(({ task }) => task),
    [tasksWithDueDate, weekStart, weekEnd],
  );

  const overdueTasks = useMemo(
    () =>
      tasksWithDueDate
        .filter(
          ({ dueDate, task }) =>
            dueDate && isBefore(dueDate, todayStart) && task.status !== 'completed',
        )
        .map(({ task }) => task),
    [tasksWithDueDate, todayStart],
  );

  const streamTasks = useMemo(
    () => tasks.filter((task) => task.category && task.category === activeStream),
    [tasks, activeStream],
  );

  const delegatedViewTasks = delegatedTasks;

  // Calculate counts for each tab
  const tabCounts = useMemo(() => ({
    today: todayTasks.length,
    week: weekTasks.length,
    overdue: overdueTasks.length,
    delegated: delegatedViewTasks.length,
    all: tasks.length,
    streams: streamTasks.length,
  }), [todayTasks.length, weekTasks.length, overdueTasks.length, delegatedViewTasks.length, tasks.length, streamTasks.length]);

  // Calculate counts for each stream category
  const streamCounts = useMemo(() => ({
    ideas: tasks.filter((task) => task.category === 'ideas').length,
    discussion: tasks.filter((task) => task.category === 'discussion').length,
    work: tasks.filter((task) => task.category === 'work').length,
    other: tasks.filter((task) => task.category === 'other').length,
  }), [tasks]);

  const activeTasks = useMemo(() => {
    switch (activeTab) {
      case 'today':
        return todayTasks;
      case 'week':
        return weekTasks;
      case 'overdue':
        return overdueTasks;
      case 'delegated':
        return delegatedViewTasks;
      case 'streams':
        return streamTasks;
      case 'all':
      default:
        return tasks;
    }
  }, [activeTab, todayTasks, weekTasks, overdueTasks, delegatedViewTasks, streamTasks, tasks]);

  // Reset pagination when tab or stream changes
  useEffect(() => {
    pagination.reset();
  }, [activeTab, activeStream]);

  // Paginated tasks
  const paginatedTasks = useMemo(() => {
    return activeTasks.slice(pagination.from, pagination.to + 1);
  }, [activeTasks, pagination.from, pagination.to]);

  // Pagination calculations
  const totalPages = Math.ceil(activeTasks.length / pagination.pageSize);
  const showingFrom = activeTasks.length > 0 ? pagination.from + 1 : 0;
  const showingTo = Math.min(pagination.to + 1, activeTasks.length);

  // Generate page numbers to display
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, pagination.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [pagination.currentPage, totalPages]);

  const isLoadingAny = isLoading || delegatedLoading;
  const hasError = Boolean(error || delegatedError);

  const handleNewTask = () => {
    setSelectedTask(null);
    setShowTaskForm(true);
  };

  const handleTabClick = (tab: TabValue) => {
    setActiveTab(tab);
    if (tab === 'streams') {
      setActiveStream('ideas');
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-foreground">My Tasks</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Stay on top of tasks assigned to you and explore streams by team focus.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => handleTabClick('streams')}>
            <Settings className="h-4 w-4" />
            Browse Streams
          </Button>
          <Button className="gap-2" onClick={handleNewTask}>
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>

      <div>
        <Tabs value={activeTab} onValueChange={handleTabClick} className="w-full overflow-auto">
          <TabsList className="grid border border-border bg-background rounded-full p-1 text-sm grid-cols-6">
            {tabDefinitions.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-full text-xs px-3 py-1 font-semibold flex items-center gap-1.5"
              >
                {tab.label}
                <Badge variant="secondary" className="ml-0.5 text-xs px-1.5 py-0">
                  {tabCounts[tab.value]}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {activeTab === 'streams' && (
          <div className="mt-4 flex flex-wrap gap-3">
            {streamDefinitions.map((stream) => {
              const Icon = stream.icon;
              const isActive = stream.value === activeStream;
              return (
                <Button
                  key={stream.value}
                  variant={isActive ? 'secondary' : 'outline'}
                  onClick={() => setActiveStream(stream.value)}
                  className="gap-2 rounded-full text-sm"
                >
                  <Icon className="h-4 w-4" />
                  {stream.label}
                  <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                    {streamCounts[stream.value]}
                  </Badge>
                </Button>
              );
            })}
          </div>
        )}
      </div>

      <section className="space-y-4">
        {hasError && (
          <Alert variant="destructive">
            <AlertDescription>Unable to load tasks. Please refresh the page.</AlertDescription>
          </Alert>
        )}
        {isLoadingAny ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        ) : activeTasks.length === 0 ? (
          <Card className="border-dashed border-border text-center py-16">
            <CardContent className="space-y-3">
              <CalendarCheck className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-semibold">No tasks {activeTab === 'today' ? 'due today' : 'found'}.</p>
              <p className="text-sm text-muted-foreground">
                {activeTab === 'today'
                  ? "You don't have any tasks due today. Great job staying on top of things!"
                  : 'Use the buttons above to create or explore more Workstreams.'}
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" onClick={() => handleTabClick('streams')}>
                  <Brain className="h-4 w-4" />
                  Browse Streams
                </Button>
                <Button onClick={handleNewTask}>
                  <Plus className="h-4 w-4" />
                  Create Task
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>

            {/* Pagination */}
            {activeTasks.length > pagination.pageSize && (
              <div className="flex flex-col items-center gap-4 pt-6">
                <p className="text-sm text-muted-foreground">
                  Showing {showingFrom} to {showingTo} of {activeTasks.length} tasks
                </p>
                {totalPages > 1 && (
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => pagination.setCurrentPage(Math.max(1, pagination.currentPage - 1))}
                          className={pagination.currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {pageNumbers.map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => pagination.setCurrentPage(page)}
                            isActive={page === pagination.currentPage}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => pagination.setCurrentPage(Math.min(totalPages, pagination.currentPage + 1))}
                          className={pagination.currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
            )}
          </>
        )}
      </section>

      <TaskForm open={showTaskForm} onOpenChange={setShowTaskForm} task={selectedTask ?? undefined} />
    </div>
  );
};

export default MyTasksPage;


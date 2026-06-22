import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAllProjectTasks } from "@/hooks/useProjectTasks";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskForm } from "@/components/tasks/TaskForm";
import { Plus, CheckCircle, Clock, AlertCircle, Calendar, History, Lightbulb, MessageSquare, Briefcase, MoreHorizontal } from "lucide-react";
import { EmptyTasks } from "@/components/empty-states/EmptyTasks";
import { usePagination } from '@/hooks/usePagination';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

type TaskCategory = 'all' | 'ideas' | 'discussion' | 'work' | 'other';

export default function ActionsTasks() {
  const navigate = useNavigate();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory>('all');
  const { data: tasks = [], isLoading, error } = useAllProjectTasks();
  const pagination = usePagination(10);

  const handleEditTask = (task: any) => {
    setSelectedTask(task);
    setShowTaskForm(true);
  };

  const handleCloseForm = () => {
    setShowTaskForm(false);
    setSelectedTask(null);
  };

  // Filter tasks by category
  const filteredTasks = useMemo(() => {
    if (selectedCategory === 'all') return tasks;
    return tasks.filter(t => t.category === selectedCategory);
  }, [tasks, selectedCategory]);

  // Category statistics
  const categoryStats = useMemo(() => {
    return {
      all: tasks.length,
      ideas: tasks.filter(t => t.category === 'ideas').length,
      discussion: tasks.filter(t => t.category === 'discussion').length,
      work: tasks.filter(t => t.category === 'work').length,
      other: tasks.filter(t => t.category === 'other').length,
    };
  }, [tasks]);

  // Reset pagination when category changes
  useEffect(() => {
    pagination.reset();
  }, [selectedCategory]);

  // Paginated tasks
  const paginatedTasks = useMemo(() => {
    return filteredTasks.slice(pagination.from, pagination.to + 1);
  }, [filteredTasks, pagination.from, pagination.to]);

  // Pagination calculations
  const totalPaginationPages = Math.ceil(filteredTasks.length / pagination.pageSize);
  const showingFrom = filteredTasks.length > 0 ? pagination.from + 1 : 0;
  const showingTo = Math.min(pagination.to + 1, filteredTasks.length);

  // Generate page numbers to display
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, pagination.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPaginationPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [pagination.currentPage, totalPaginationPages]);

  // Task statistics (for current filter)
  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress').length;
  const blockedTasks = filteredTasks.filter(t => t.status === 'blocked').length;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">Unable to Load Tasks</h3>
          <p className="text-muted-foreground">
            There was an error loading your tasks. Please try refreshing.
          </p>
        </div>
        <Button onClick={() => window.location.reload()}>
          Refresh Page
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">All Tasks</h1>
          <p className="text-muted-foreground">
            View all tasks across the team and manage end-of-day submissions
          </p>
        </div>
        <Button onClick={() => setShowTaskForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* EOD Quick Access Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Submit End of Day Report</CardTitle>
                <CardDescription>Log your daily work progress and accomplishments</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/bd/actions/eod')}>
              <Calendar className="mr-2 h-4 w-4" />
              Submit EOD
            </Button>
          </CardContent>
        </Card>

        <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <History className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-lg">My EOD Submissions</CardTitle>
                <CardDescription>View your past End of Day submissions and work history</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => navigate('/bd/actions/eod-history')}>
              <History className="mr-2 h-4 w-4" />
              View History
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              Across all projects
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedTasks}</div>
            <p className="text-xs text-muted-foreground">
              {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}% completion rate
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{inProgressTasks}</div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{blockedTasks}</div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tasks List with Category Filter */}
      <Card>
        <CardHeader>
          <CardTitle>All Tasks</CardTitle>
          <CardDescription>View and manage your tasks by category</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category Tabs */}
          <Tabs value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as TaskCategory)} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all" className="gap-2">
                All
                <Badge variant="secondary" className="ml-1">{categoryStats.all}</Badge>
              </TabsTrigger>
              <TabsTrigger value="ideas" className="gap-2">
                <Lightbulb className="h-4 w-4" />
                Ideas
                <Badge variant="secondary" className="ml-1">{categoryStats.ideas}</Badge>
              </TabsTrigger>
              <TabsTrigger value="discussion" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Discussion
                <Badge variant="secondary" className="ml-1">{categoryStats.discussion}</Badge>
              </TabsTrigger>
              <TabsTrigger value="work" className="gap-2">
                <Briefcase className="h-4 w-4" />
                Work
                <Badge variant="secondary" className="ml-1">{categoryStats.work}</Badge>
              </TabsTrigger>
              <TabsTrigger value="other" className="gap-2">
                <MoreHorizontal className="h-4 w-4" />
                Other
                <Badge variant="secondary" className="ml-1">{categoryStats.other}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filtered Tasks */}
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground">
                {selectedCategory === 'all'
                  ? 'No tasks yet. Create your first task!'
                  : `No ${selectedCategory} tasks yet.`
                }
              </div>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowTaskForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            </div>
          ) : (
            <>
              <div className="grid gap-4">
                {paginatedTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onEdit={handleEditTask} />
                ))}
              </div>

              {/* Pagination */}
              {filteredTasks.length > pagination.pageSize && (
                <div className="flex flex-col items-center gap-4 pt-6">
                  <p className="text-sm text-muted-foreground">
                    Showing {showingFrom} to {showingTo} of {filteredTasks.length} tasks
                  </p>
                  {totalPaginationPages > 1 && (
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
                            onClick={() => pagination.setCurrentPage(Math.min(totalPaginationPages, pagination.currentPage + 1))}
                            className={pagination.currentPage === totalPaginationPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <TaskForm 
        open={showTaskForm}
        onOpenChange={handleCloseForm}
        task={selectedTask}
      />
    </div>
  );
}
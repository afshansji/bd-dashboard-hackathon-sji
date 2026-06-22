import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Project {
  id: string;
  client_id: string;
  name: string;
  description?: string;
  status: 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  budget?: number;
  actual_cost?: number;
  start_date?: string;
  end_date?: string;
  deadline?: string;
  progress?: number;
  assigned_team?: string[];
  project_manager?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  // Joined data
  client?: {
    id: string;
    name: string;
    company?: string;
  };
}

export interface ProjectTask {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  estimated_hours?: number;
  actual_hours?: number;
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectData {
  client_id: string;
  name: string;
  description?: string;
  status?: 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  budget?: number;
  start_date?: string;
  end_date?: string;
  deadline?: string;
  progress?: number;
  assigned_team?: string[];
  project_manager?: string;
  tags?: string[];
}

export interface UpdateProjectData extends Partial<CreateProjectData> {}

export interface CreateTaskData {
  project_id: string;
  title: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'review' | 'completed' | 'blocked';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  estimated_hours?: number;
  due_date?: string;
}

interface ProjectsResponse {
  data: Project[];
  count: number;
}

interface UseProjectsParams {
  page?: number;
  limit?: number;
  status?: string;
  client_id?: string;
  search?: string;
}

export function useProjects(params: UseProjectsParams = {}) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const { page = 1, limit = 10, status, client_id, search } = params;

  const fetchProjects = async (): Promise<ProjectsResponse> => {
    if (!user?.id) throw new Error("User not authenticated");

    let query = supabase
      .from('projects')
      .select(`
        *,
        client:clients(id, name, company)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (client_id) {
      query = query.eq('client_id', client_id);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: (data || []) as unknown as Project[],
      count: count || 0
    };
  };

  const createProject = async (projectData: CreateProjectData): Promise<Project> => {
    if (!user?.id) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from('projects')
      .insert([{
        ...projectData,
        project_manager: projectData.project_manager || user.id
      }])
      .select(`
        *,
        client:clients(id, name, company)
      `)
      .single();

    if (error) throw error;
    
    toast.success("Project created successfully");
    await loadProjects();
    return data as unknown as Project;
  };

  const updateProject = async (projectId: string, projectData: UpdateProjectData): Promise<Project> => {
    if (!user?.id) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from('projects')
      .update(projectData)
      .eq('id', projectId)
      .select(`
        *,
        client:clients(id, name, company)
      `)
      .single();

    if (error) throw error;

    toast.success("Project updated successfully");
    await loadProjects();
    return data as unknown as Project;
  };

  const deleteProject = async (projectId: string): Promise<void> => {
    if (!user?.id) throw new Error("User not authenticated");

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) throw error;

    toast.success("Project deleted successfully");
    await loadProjects();
  };

  const getProjectById = async (projectId: string): Promise<Project | null> => {
    if (!user?.id) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        client:clients(id, name, company)
      `)
      .eq('id', projectId)
      .maybeSingle();

    if (error) throw error;
    return data as unknown as Project | null;
  };

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchProjects();
      setProjects(response.data);
      setTotalCount(response.count);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch projects');
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadProjects();
    }
  }, [user?.id, page, limit, status, client_id, search]);

  return {
    projects,
    loading,
    error,
    totalCount,
    createProject,
    updateProject,
    deleteProject,
    getProjectById,
    refetch: loadProjects
  };
}

// Hook for project tasks
export function useProjectTasks(projectId: string) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    if (!user?.id || !projectId) return;

    const { data, error } = await supabase
      .from('project_tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as ProjectTask[];
  };

  const createTask = async (taskData: CreateTaskData): Promise<ProjectTask> => {
    if (!user?.id) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from('project_tasks')
      .insert([taskData])
      .select()
      .single();

    if (error) throw error;
    
    toast.success("Task created successfully");
    await loadTasks();
    return data as ProjectTask;
  };

  const updateTask = async (taskId: string, taskData: Partial<ProjectTask>): Promise<ProjectTask> => {
    if (!user?.id) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from('project_tasks')
      .update(taskData)
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;

    toast.success("Task updated successfully");
    await loadTasks();
    return data as ProjectTask;
  };

  const deleteTask = async (taskId: string): Promise<void> => {
    if (!user?.id) throw new Error("User not authenticated");

    const { error } = await supabase
      .from('project_tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;

    toast.success("Task deleted successfully");
    await loadTasks();
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTasks();
      setTasks(data as ProjectTask[]);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch tasks');
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id && projectId) {
      loadTasks();
    }
  }, [user?.id, projectId]);

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    refetch: loadTasks
  };
}
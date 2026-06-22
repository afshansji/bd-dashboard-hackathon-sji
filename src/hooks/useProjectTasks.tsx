import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { logUserActivity } from '@/services/userActivityService';

export interface TaskLabel {
  id: string;
  name: string;
  color: string;
  created_at?: string;
  created_by?: string;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_by?: string;
  created_at: string;
}

export interface GoogleFolder {
  id: string;
  name?: string;
  url?: string;
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
  created_by?: string;
  // Category field for task organization
  category?: 'ideas' | 'discussion' | 'work' | 'other';
  // New enhanced fields
  is_campaign_associated?: boolean;
  campaign_id?: string | null;
  google_folder?: GoogleFolder | null;
  active_collab_link?: string | null;
  workboard_ai_link?: string | null;
  reference_url?: string | null;
  labels?: TaskLabel[];
  attachments?: TaskAttachment[];
}

export interface CreateProjectTaskData {
  project_id: string;
  title: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'review' | 'completed' | 'blocked';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  estimated_hours?: number;
  due_date?: string;
  // New enhanced fields
  is_campaign_associated?: boolean;
  campaign_id?: string | null;
  google_folder?: GoogleFolder | null;
  active_collab_link?: string | null;
  workboard_ai_link?: string | null;
  reference_url?: string | null;
}

export interface UpdateProjectTaskData {
  title?: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'review' | 'completed' | 'blocked';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  estimated_hours?: number;
  actual_hours?: number;
  due_date?: string;
  completed_at?: string | null;
  // New enhanced fields
  is_campaign_associated?: boolean;
  campaign_id?: string | null;
  google_folder?: GoogleFolder | null;
  active_collab_link?: string | null;
  workboard_ai_link?: string | null;
  reference_url?: string | null;
}

export const useProjectTasks = (projectId?: string) => {
  return useQuery({
    queryKey: ['project-tasks', projectId],
    queryFn: async () => {
      let query = supabase
        .from('project_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching project tasks:', error);
        throw error;
      }

      return data as unknown as ProjectTask[];
    },
    retry: 2,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to fetch tasks assigned to the current user only
 * Used for "My Tasks" personal view
 */
export const useMyProjectTasks = () => {
  return useQuery({
    queryKey: ['my-project-tasks'],
    queryFn: async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.error('No authenticated user');
        return [];
      }

      // Fetch tasks assigned to current user
      const { data, error } = await supabase
        .from('project_tasks')
        .select('*')
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user tasks:', error);
        throw error;
      }

      return data as unknown as ProjectTask[];
    },
    retry: 2,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to fetch ALL project tasks across all users
 * Used for team-wide task view (e.g., /bd/actions/tasks)
 */
export const useAllProjectTasks = () => {
  return useQuery({
    queryKey: ['all-project-tasks'],
    queryFn: async () => {
      // Fetch ALL tasks without user filter
      const { data, error } = await supabase
        .from('project_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all project tasks:', error);
        throw error;
      }

      return data as unknown as ProjectTask[];
    },
    retry: 2,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

export const useDelegatedProjectTasks = () => {
  return useQuery({
    queryKey: ['delegated-project-tasks'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.error('No authenticated user for delegated tasks');
        return [];
      }

      const { data, error } = await supabase
        .from('project_tasks')
        .select('*')
        .eq('created_by', user.id)
        .neq('assigned_to', user.id)
        .not('assigned_to', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching delegated tasks:', error);
        throw error;
      }

      return data as unknown as ProjectTask[];
    },
    retry: 2,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateProjectTask = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (taskData: CreateProjectTaskData) => {
      const { data, error } = await supabase
        .from('project_tasks')
        .insert([taskData as any])
        .select()
        .single();

      if (error) {
        console.error('Error creating project task:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['all-project-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-project-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['delegated-project-tasks'] });
      if (user?.id && data?.id) {
        void logUserActivity({
          userId: user.id,
          action: 'task_created',
          resourceType: 'task',
          resourceId: data.id,
          metadata: { project_id: data.project_id },
        });
      }
      toast({
        title: "Task created",
        description: "Project task has been created successfully.",
      });
    },
    onError: (error) => {
      console.error('Create project task error:', error);
      toast({
        title: "Error",
        description: "Failed to create project task. Please try again.",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateProjectTask = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateProjectTaskData }) => {
      const updateData = { ...updates };
      
      // Set completed_at when status changes to completed
      if (updates.status === 'completed' && !updateData.completed_at) {
        updateData.completed_at = new Date().toISOString();
      } else if (updates.status !== 'completed') {
        updateData.completed_at = null;
      }

      const { data, error } = await supabase
        .from('project_tasks')
        .update(updateData as any)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating project task:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['all-project-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-project-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['delegated-project-tasks'] });
      if (user?.id && data?.id && variables?.updates?.status === 'completed') {
        void logUserActivity({
          userId: user.id,
          action: 'task_completed',
          resourceType: 'task',
          resourceId: data.id,
          metadata: { project_id: data.project_id },
        });
      }
      toast({
        title: "Task updated",
        description: "Project task has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Update project task error:', error);
      toast({
        title: "Error",
        description: "Failed to update project task. Please try again.",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteProjectTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_tasks')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting project task:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['all-project-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-project-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['delegated-project-tasks'] });
      toast({
        title: "Task deleted",
        description: "Project task has been deleted successfully.",
      });
    },
    onError: (error) => {
      console.error('Delete project task error:', error);
      toast({
        title: "Error",
        description: "Failed to delete project task. Please try again.",
        variant: "destructive",
      });
    },
  });
};
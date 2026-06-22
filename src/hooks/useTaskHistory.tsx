import { useQuery } from '@tanstack/react-query';
import { fetchTaskHistory, type TaskHistoryEntry } from '@/services/taskHistoryService';

export const useTaskHistory = (taskId?: string) => {
  const { data: history = [], isLoading, error, refetch } = useQuery({
    queryKey: ['task-history', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      return await fetchTaskHistory(taskId);
    },
    enabled: !!taskId,
    staleTime: 60000, // 1 minute
  });

  return {
    history,
    isLoading,
    error,
    refetch,
  };
};

export type { TaskHistoryEntry };


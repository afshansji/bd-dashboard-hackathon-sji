import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserActivitySummary {
  activeUsers: {
    day: number;
    week: number;
    month: number;
  };
  totalEvents: number;
  totalLogins: number;
  periodStart: string;
  periodEnd: string;
}

export interface ActivityLeaderboardEntry {
  userId: string;
  userName: string;
  activityCount: number;
  loginCount: number;
  lastActivityAt: string;
  activityScore: number;
}

export interface ActivityTeamMemberEntry {
  userId: string;
  userName: string;
  activityCount: number;
  loginCount: number;
  lastActivityAt: string | null;
  activityScore: number;
}

export interface RecentActivityEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  createdAt: string;
}

export interface ActivityMemberProfile {
  id: string;
  full_name: string | null;
  email: string | null;
}

export interface UserActivityStatsResponse {
  summary: UserActivitySummary;
  activityBreakdown: Record<string, number>;
  leaderboard: ActivityLeaderboardEntry[];
  recentActivity: RecentActivityEntry[];
  member?: ActivityMemberProfile | null;
  teamMembers?: ActivityTeamMemberEntry[];
}

interface UseUserActivityStatsOptions {
  period?: '7d' | '30d' | '90d';
  recentLimit?: number;
  includeAllUsers?: boolean;
}

export function useUserActivityStats(options: UseUserActivityStatsOptions = {}) {
  const { period = '30d', recentLimit = 20, includeAllUsers = false } = options;

  return useQuery({
    queryKey: ['user-activity-stats', period, recentLimit, includeAllUsers],
    queryFn: async () => {
      const params = new URLSearchParams({
        period,
        recentLimit: recentLimit.toString(),
        includeAllUsers: includeAllUsers.toString(),
      });

      const { data, error } = await supabase.functions.invoke(
        `user-activity-stats?${params.toString()}`,
        { method: 'GET' }
      );

      if (error) throw error;
      return data as UserActivityStatsResponse;
    },
    refetchInterval: 60000,
  });
}

export function useSendLowUsageNotifications() {
  return useMutation({
    mutationFn: async (days: number = 7) => {
      const params = new URLSearchParams({ days: days.toString() });
      const { data, error } = await supabase.functions.invoke(
        `notify-low-usage?${params.toString()}`,
        { method: 'POST' }
      );

      if (error) throw error;
      return data as {
        notifiedCount: number;
        inactiveCount: number;
        skippedCount: number;
      };
    },
  });
}

export function useUserActivityMemberStats(userId: string | null, period: '7d' | '30d' | '90d' = '30d') {
  return useQuery({
    queryKey: ['user-activity-member-stats', userId, period],
    queryFn: async () => {
      if (!userId) {
        throw new Error('Missing userId');
      }

      const params = new URLSearchParams({
        period,
        userId,
      });

      const { data, error } = await supabase.functions.invoke(
        `user-activity-stats?${params.toString()}`,
        { method: 'GET' }
      );

      if (error) throw error;
      return data as UserActivityStatsResponse;
    },
    enabled: !!userId,
    refetchInterval: 60000,
  });
}

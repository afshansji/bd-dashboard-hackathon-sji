import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserPerformanceMetrics {
  id: string;
  user_id: string;
  metric_period: 'daily' | 'weekly' | 'monthly';
  period_start: string;
  period_end: string;
  campaigns_owned: number;
  contacts_reached: number;
  responses_received: number;
  meetings_booked: number;
  deals_closed: number;
  deals_created: number;
  deals_won: number;
  deals_lost: number;
  total_deal_value: number;
  ai_agents_run: number;
  eod_submissions: number;
  tasks_completed: number;
  performance_score: number;
  efficiency_rating: number;
}

export interface TeamMember {
  userId: string;
  userName: string;
  metrics: UserPerformanceMetrics;
  rank: number;
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  performanceScore: number;
}

export interface TeamPerformanceData {
  teamMembers: TeamMember[];
  leaderboard: LeaderboardEntry[];
}

interface UseTeamPerformanceOptions {
  period?: 'daily' | 'weekly' | 'monthly';
  startDate?: Date;
  endDate?: Date;
  userId?: string;
}

export function useTeamPerformance(options: UseTeamPerformanceOptions = {}) {
  const { period = 'monthly', startDate, endDate, userId } = options;

  return useQuery({
    queryKey: ['team-performance', period, startDate, endDate, userId],
    queryFn: async () => {
      const params = new URLSearchParams({
        period,
        ...(startDate && { startDate: startDate.toISOString() }),
        ...(endDate && { endDate: endDate.toISOString() }),
        ...(userId && { userId }),
      });

      const { data, error } = await supabase.functions.invoke(
        `team-performance?${params.toString()}`,
        { method: 'GET' }
      );

      if (error) throw error;

      return data as TeamPerformanceData;
    },
    refetchInterval: 60000, // Refetch every minute
  });
}

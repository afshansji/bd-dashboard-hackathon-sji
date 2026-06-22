import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SystemStats {
  totalBrands: number;
  totalUsers: number;
  totalIntegrations: number;
  totalRevenue: number;
}

export interface RecentActivity {
  id: string;
  action: string;
  brand?: string;
  user?: string;
  time: string;
  type: 'brand' | 'system';
}

export interface ExtendedSystemStats extends SystemStats {
  totalPods: number;
  totalNiches: number;
  totalProducts: number;
  todayEOD: number;
  aiAgentRuns24h: number;
}

export function useSystemStats() {
  return useQuery({
    queryKey: ['system-stats'],
    queryFn: async () => {
      const stats: ExtendedSystemStats = {
        totalBrands: 0,
        totalUsers: 0,
        totalIntegrations: 0,
        totalRevenue: 0,
        totalPods: 0,
        totalNiches: 0,
        totalProducts: 0,
        todayEOD: 0,
        aiAgentRuns24h: 0
      };
      
      const recentActivity: RecentActivity[] = [];

      try {
        // Fetch total users
        const { count: usersCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });
        stats.totalUsers = usersCount || 0;

        // Fetch active integrations (brand integrations)
        const { count: integrationsCount } = await supabase
          .from('brand_integrations')
          .select('*', { count: 'exact', head: true })
          .eq('is_enabled', true);
        stats.totalIntegrations = integrationsCount || 0;

        // Fetch total PODs
        const { count: podsCount } = await supabase
          .from('pods')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);
        stats.totalPods = podsCount || 0;

        // Fetch total niches
        const { count: nichesCount } = await supabase
          .from('target_niches')
          .select('*', { count: 'exact', head: true });
        stats.totalNiches = nichesCount || 0;

        // Fetch total products
        const { count: productsCount } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);
        stats.totalProducts = productsCount || 0;

        // Fetch today's EOD submissions
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count: eodCount } = await supabase
          .from('team_summaries')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today.toISOString());
        stats.todayEOD = eodCount || 0;

        // Fetch AI agent runs in last 24 hours
        const yesterday = new Date();
        yesterday.setHours(yesterday.getHours() - 24);
        const { count: agentRunsCount } = await supabase
          .from('ai_agent_runs')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', yesterday.toISOString());
        stats.aiAgentRuns24h = agentRunsCount || 0;

        // Build recent activity
        if (stats.totalIntegrations > 0) {
          recentActivity.push({
            id: `integration-${Date.now()}`,
            action: `${stats.totalIntegrations} active integration${stats.totalIntegrations > 1 ? 's' : ''} monitored`,
            time: new Date().toLocaleString(),
            type: 'system'
          });
        }

        if (stats.todayEOD > 0) {
          recentActivity.push({
            id: `eod-${Date.now()}`,
            action: `${stats.todayEOD} EOD submission${stats.todayEOD > 1 ? 's' : ''} received today`,
            time: new Date().toLocaleString(),
            type: 'system'
          });
        }

        if (stats.aiAgentRuns24h > 0) {
          recentActivity.push({
            id: `ai-${Date.now()}`,
            action: `${stats.aiAgentRuns24h} AI agent run${stats.aiAgentRuns24h > 1 ? 's' : ''} completed`,
            time: new Date().toLocaleString(),
            type: 'system'
          });
        }
      } catch (error) {
        console.error('Error fetching system stats:', error);
      }

      // Sort by time
      recentActivity.sort((a, b) => 
        new Date(b.time).getTime() - new Date(a.time).getTime()
      );

      return { stats, recentActivity };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

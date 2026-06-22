import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ClientHealthStats {
  activeDeals: number;
  pipelineValue: number;
  daysSinceContact: number | null;
  pendingFollowups: number;
  overdueFollowups: number;
  recentComments: Array<{
    content: string;
    createdAt: string;
    dealTitle: string;
  }>;
  dealsAtRisk: number;
  avgDealVelocity: number | null;
}

export function useClientHealthStats(clientId: string | undefined) {
  return useQuery({
    queryKey: ["client-health-stats", clientId],
    queryFn: async (): Promise<ClientHealthStats> => {
      if (!clientId) {
        return {
          activeDeals: 0,
          pipelineValue: 0,
          daysSinceContact: null,
          pendingFollowups: 0,
          overdueFollowups: 0,
          recentComments: [],
          dealsAtRisk: 0,
          avgDealVelocity: null,
        };
      }

      const now = new Date();

      // Fetch deals for this client
      const { data: deals, error: dealsError } = await supabase
        .from("deals")
        .select("id, title, amount, stage, created_at, updated_at")
        .eq("client_id", clientId);

      if (dealsError) throw dealsError;

      const activeDeals = deals?.filter(
        (d) => !["closed_won", "closed_lost", "cancelled"].includes(d.stage || "")
      ) || [];

      const pipelineValue = activeDeals.reduce(
        (sum, d) => sum + (Number(d.amount) || 0),
        0
      );

      // Identify stalled deals (same stage > 14 days)
      const dealsAtRisk = activeDeals.filter((d) => {
        const updatedAt = new Date(d.updated_at);
        const daysSinceUpdate = Math.floor(
          (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysSinceUpdate > 14;
      }).length;

      // Get deal IDs for further queries
      const dealIds = deals?.map((d) => d.id) || [];

      // Fetch recent comments
      let recentComments: ClientHealthStats["recentComments"] = [];
      let daysSinceContact: number | null = null;

      if (dealIds.length > 0) {
        const { data: comments } = await supabase
          .from("deal_comments")
          .select("comment, created_at, deal_id")
          .in("deal_id", dealIds)
          .order("created_at", { ascending: false })
          .limit(5);

        if (comments && comments.length > 0) {
          const dealMap = new Map(deals?.map((d) => [d.id, d.title]) || []);
          recentComments = comments.map((c) => ({
            content: c.comment?.substring(0, 100) + (c.comment && c.comment.length > 100 ? "..." : ""),
            createdAt: c.created_at,
            dealTitle: dealMap.get(c.deal_id) || "Unknown Deal",
          }));

          const lastCommentDate = new Date(comments[0].created_at);
          daysSinceContact = Math.floor(
            (now.getTime() - lastCommentDate.getTime()) / (1000 * 60 * 60 * 24)
          );
        }
      }

      // Fetch followups (using "date" as the due date field)
      let pendingFollowups = 0;
      let overdueFollowups = 0;

      if (dealIds.length > 0) {
        const { data: followups } = await supabase
          .from("followups")
          .select("id, date, status")
          .in("deal_id", dealIds)
          .eq("status", "pending");

        if (followups) {
          pendingFollowups = followups.length;
          overdueFollowups = followups.filter((f) => {
            if (!f.date) return false;
            return new Date(f.date) < now;
          }).length;
        }
      }

      // Calculate average deal velocity (days from creation to current stage)
      let avgDealVelocity: number | null = null;
      if (activeDeals.length > 0) {
        const totalDays = activeDeals.reduce((sum, d) => {
          const created = new Date(d.created_at);
          return sum + Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        }, 0);
        avgDealVelocity = Math.round(totalDays / activeDeals.length);
      }

      return {
        activeDeals: activeDeals.length,
        pipelineValue,
        daysSinceContact,
        pendingFollowups,
        overdueFollowups,
        recentComments,
        dealsAtRisk,
        avgDealVelocity,
      };
    },
    enabled: !!clientId,
    staleTime: 30000, // 30 seconds
  });
}

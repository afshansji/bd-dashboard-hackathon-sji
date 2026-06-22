import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MessageAnalytics {
  totalGenerated: number;
  totalSent: number;
  totalResponses: number;
  responseRate: number;
  byMessageType: {
    message_type: string;
    total_generated: number;
    total_sent: number;
    total_responses: number;
    response_rate: number;
  }[];
  byTone: {
    tone: string;
    count: number;
    sent: number;
    responses: number;
    responseRate: number;
  }[];
  recentPerformance: {
    date: string;
    sent: number;
    responses: number;
  }[];
}

export function useLinkedInMessageAnalytics(campaignId?: string) {
  return useQuery({
    queryKey: ["linkedin-message-analytics", campaignId],
    queryFn: async (): Promise<MessageAnalytics> => {
      // Build query
      let query = supabase
        .from('campaign_contact_linkedin_messages')
        .select('*');
      
      if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const messages = data || [];

      // Calculate aggregates
      const totalGenerated = messages.length;
      const totalSent = messages.filter(m => m.sent_at).length;
      const totalResponses = messages.filter(m => m.response_received).length;
      const responseRate = totalSent > 0 ? (totalResponses / totalSent) * 100 : 0;

      // Group by message type
      const byTypeMap = new Map<string, { generated: number; sent: number; responses: number }>();
      messages.forEach(m => {
        const type = m.message_type;
        const existing = byTypeMap.get(type) || { generated: 0, sent: 0, responses: 0 };
        existing.generated++;
        if (m.sent_at) existing.sent++;
        if (m.response_received) existing.responses++;
        byTypeMap.set(type, existing);
      });

      const byMessageType = Array.from(byTypeMap.entries()).map(([type, stats]) => ({
        message_type: type,
        total_generated: stats.generated,
        total_sent: stats.sent,
        total_responses: stats.responses,
        response_rate: stats.sent > 0 ? (stats.responses / stats.sent) * 100 : 0,
      }));

      // Group by tone (from variant_sent)
      const byToneMap = new Map<string, { count: number; sent: number; responses: number }>();
      messages.forEach(m => {
        if (m.variant_sent) {
          const tone = m.variant_sent;
          const existing = byToneMap.get(tone) || { count: 0, sent: 0, responses: 0 };
          existing.count++;
          if (m.sent_at) existing.sent++;
          if (m.response_received) existing.responses++;
          byToneMap.set(tone, existing);
        }
      });

      const byTone = Array.from(byToneMap.entries()).map(([tone, stats]) => ({
        tone,
        count: stats.count,
        sent: stats.sent,
        responses: stats.responses,
        responseRate: stats.sent > 0 ? (stats.responses / stats.sent) * 100 : 0,
      }));

      // Recent performance (last 7 days)
      const now = new Date();
      const recentPerformance: { date: string; sent: number; responses: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayMessages = messages.filter(m => 
          m.sent_at && m.sent_at.startsWith(dateStr)
        );
        const dayResponses = messages.filter(m => 
          m.response_received_at && m.response_received_at.startsWith(dateStr)
        );

        recentPerformance.push({
          date: dateStr,
          sent: dayMessages.length,
          responses: dayResponses.length,
        });
      }

      return {
        totalGenerated,
        totalSent,
        totalResponses,
        responseRate,
        byMessageType,
        byTone,
        recentPerformance,
      };
    },
    enabled: true,
  });
}

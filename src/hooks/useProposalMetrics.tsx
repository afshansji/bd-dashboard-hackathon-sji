import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProposalMetrics {
  totalProposals: number;
  sentThisMonth: number;
  signedThisMonth: number;
  conversionRate: number;
  avgTimeToSign: number | null;
}

export function useProposalMetrics() {
  return useQuery({
    queryKey: ['proposal-metrics'],
    queryFn: async (): Promise<ProposalMetrics> => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Get all proposals
      const { data: allProposals, error: allError } = await supabase
        .from('proposal_documents')
        .select('id, status, sent_at, completed_at')
        .order('created_at', { ascending: false });

      if (allError) throw allError;

      // Get proposals sent this month
      const { data: sentThisMonth, error: sentError } = await supabase
        .from('proposal_documents')
        .select('id')
        .gte('sent_at', startOfMonth)
        .not('sent_at', 'is', null);

      if (sentError) throw sentError;

      // Get proposals signed this month
      const { data: signedThisMonth, error: signedError } = await supabase
        .from('proposal_documents')
        .select('id, sent_at, completed_at')
        .eq('status', 'signed')
        .gte('completed_at', startOfMonth);

      if (signedError) throw signedError;

      // Calculate average time to sign (in hours)
      let avgTimeToSign: number | null = null;
      const signedProposals = allProposals?.filter(p => 
        p.status === 'signed' && p.sent_at && p.completed_at
      ) || [];

      if (signedProposals.length > 0) {
        const totalHours = signedProposals.reduce((sum, p) => {
          const sentDate = new Date(p.sent_at!);
          const completedDate = new Date(p.completed_at!);
          const diffMs = completedDate.getTime() - sentDate.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);
          return sum + diffHours;
        }, 0);
        avgTimeToSign = Math.round(totalHours / signedProposals.length);
      }

      // Calculate conversion rate (signed / sent this month)
      const sentCount = sentThisMonth?.length || 0;
      const signedCount = signedThisMonth?.length || 0;
      const conversionRate = sentCount > 0 ? Math.round((signedCount / sentCount) * 100) : 0;

      return {
        totalProposals: allProposals?.length || 0,
        sentThisMonth: sentCount,
        signedThisMonth: signedCount,
        conversionRate,
        avgTimeToSign,
      };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

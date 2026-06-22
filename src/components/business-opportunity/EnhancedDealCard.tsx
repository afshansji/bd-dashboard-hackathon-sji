import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ExternalLink, Calendar, TrendingUp, Building2, AlertTriangle } from "lucide-react";
import { cn, getBestClientName } from "@/lib/utils";
import { formatDistanceToNow, differenceInDays, isPast } from "date-fns";
import { Link } from "react-router-dom";
import { ClientQuickPreview } from "./ClientQuickPreview";

interface Client { id: string; name: string; slug: string; status?: string; industry?: string; region?: string; }

interface EnhancedDealCardProps {
  deal: {
    id: string; slug?: string; deal_name: string; client: string | Client; client_id?: string;
    stage: string; value: number; expected_close_date?: string; created_at: string;
    pod_assigned?: string; lead_source?: string; dealtype?: string; days_in_stage?: number;
    clients?: Client | null;
  };
  onViewDetails: (slug: string) => void;
}

export function EnhancedDealCard({ deal, onViewDetails }: EnhancedDealCardProps) {
  const getCloseDateStatus = () => {
    if (!deal.expected_close_date) return null;
    const closeDate = new Date(deal.expected_close_date);
    const daysUntilClose = differenceInDays(closeDate, new Date());
    const isOverdue = isPast(closeDate);
    if (isOverdue) return { label: `${Math.abs(daysUntilClose)}d overdue`, variant: "destructive" as const, className: "border-red-500 bg-red-50 dark:bg-red-950/30" };
    if (daysUntilClose <= 7) return { label: `${daysUntilClose}d left`, variant: "secondary" as const, className: "border-amber-500 bg-amber-50 dark:bg-amber-950/30" };
    return { label: `${daysUntilClose}d left`, variant: "outline" as const, className: "" };
  };

  const getStageVariant = (stage: string) => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = { lead: "outline", discovery: "secondary", estimation: "secondary", proposal: "secondary", accepted: "default", lost: "destructive" };
    return variants[stage] || "outline";
  };

  const formatCurrencyShort = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  const closeStatus = getCloseDateStatus();
  const dealAge = formatDistanceToNow(new Date(deal.created_at), { addSuffix: true });

  return (
    <Card className={cn("hover:shadow-lg transition-all", closeStatus?.className)}>
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1 min-w-0">
            <h3 className="font-semibold leading-none truncate" title={deal.deal_name}>{deal.deal_name}</h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Building2 className="h-3 w-3" />
              {(() => {
                const clientData = deal.clients || (typeof deal.client === 'object' && deal.client?.slug ? deal.client : null);
                if (deal.client_id && clientData?.slug) {
                  return (
                    <ClientQuickPreview client={clientData as Client}>
                      <Link to={`/clients/${clientData.slug}`} className="hover:text-primary hover:underline truncate" onClick={(e) => e.stopPropagation()}>{getBestClientName(deal)}</Link>
                    </ClientQuickPreview>
                  );
                }
                return (<span className="flex items-center gap-1 truncate">{getBestClientName(deal)}{!deal.client_id && <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />}</span>);
              })()}
            </div>
          </div>
          <Badge variant={getStageVariant(deal.stage)} className="shrink-0">{deal.stage}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <span className="text-2xl font-bold">{formatCurrencyShort(deal.value)}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {deal.pod_assigned && <Badge variant="outline" className="text-xs"><Building2 className="h-3 w-3 mr-1" />{deal.pod_assigned}</Badge>}
          {deal.lead_source && <Badge variant="secondary" className="text-xs">{deal.lead_source}</Badge>}
          {deal.dealtype && <Badge variant="outline" className="text-xs">{deal.dealtype}</Badge>}
          {!deal.client_id && <Badge variant="destructive" className="text-xs flex items-center gap-1"><AlertTriangle className="h-3 w-3" />No Client Link</Badge>}
        </div>
        {deal.expected_close_date && closeStatus && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-muted-foreground"><Calendar className="h-3 w-3" /><span>{new Date(deal.expected_close_date).toLocaleDateString()}</span></div>
            <Badge variant={closeStatus.variant} className="text-xs">{closeStatus.label}</Badge>
          </div>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Created {dealAge}</span>
          {deal.days_in_stage !== undefined && <span>{deal.days_in_stage} days in stage</span>}
        </div>
      </CardContent>
      <CardFooter className="pt-3">
        <Button variant="outline" size="sm" className="w-full" onClick={() => onViewDetails(deal.slug || deal.id)}>View Details<ExternalLink className="h-3 w-3 ml-2" /></Button>
      </CardFooter>
    </Card>
  );
}

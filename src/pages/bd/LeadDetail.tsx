import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Globe2 } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLeadBySlug } from "@/hooks/useLeadBySlug";
import { useExaIntegration } from "@/hooks/useExaIntegration";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { usePushLeadToGHL } from "@/hooks/usePushLeadToGHL";

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const buildName = (lead?: { contact_name?: string | null; company_name?: string | null }) => {
  if (!lead) return "";
  return lead.contact_name || lead.company_name || "";
};

export default function LeadDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: lead, isLoading, isError, error } = useLeadBySlug(slug);
  const leadId = lead?.id;
  const { enrichLead, isEnriching } = useExaIntegration();
  const { hasPermission } = useUserPermissions();
  const { mutate: pushToGHL, isPending: isPushingToGHL } = usePushLeadToGHL();

  const canEnrich = useMemo(
    () =>
      Boolean(leadId) &&
      (hasPermission(["exa", "exa_integration", "exa_leads", "lead_enrich"], "edit") || hasPermission(/exa/i, "edit")),
    [hasPermission, leadId],
  );

  const handleEnrich = async () => {
    if (!leadId) return;
    try {
      await enrichLead({ leadId });
    } catch (error) {
      console.error("Unable to enrich lead", error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading lead details...
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto py-10 space-y-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to prospecting
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Unable to load lead</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-destructive">
            {(error as Error)?.message ?? "An unexpected error occurred."}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!lead) {
    return null;
  }

  const name = buildName(lead);
  const status = (lead.enrichment_status || lead.status || "pending").replace(/_/g, " ");
  const metadataEntries = Object.entries(lead.metadata ?? {}).filter(([, value]) => value !== null && value !== undefined);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild className="gap-2 w-fit">
          <Link to="/prospecting">
            <ArrowLeft className="h-4 w-4" /> Back to prospecting
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          {leadId && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => pushToGHL({ leadId })}
                    disabled={isPushingToGHL || !leadId}
                  >
                    {isPushingToGHL ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {(lead as any)?.gohighlevel_contact_id ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (lead as any)?.gohighlevel_contact_id ? (
                      'Update in Leadslift'
                    ) : (
                      'Add Contact & Create Deal on Leadslift'
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {(lead as any)?.gohighlevel_contact_id
                    ? 'Update this lead contact in Leadslift/GoHighLevel CRM'
                    : 'Add this lead as a contact and create an opportunity in Leadslift CRM'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-semibold flex items-center gap-2">
              <span>{name || "Unnamed lead"}</span>
              <Badge variant="outline" className="uppercase tracking-wide">
                {status}
              </Badge>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {lead.company_name && <span>Company: {lead.company_name}</span>}
              <span>Created: {formatDateTime(lead.created_at)}</span>
              <span>Updated: {formatDateTime(lead.updated_at)}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {canEnrich && (
              <Button onClick={handleEnrich} disabled={isEnriching} className="gap-2">
                {isEnriching && <Loader2 className="h-4 w-4 animate-spin" />} Enrich lead
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase">Contact details</h3>
              <Separator className="my-2" />
              <dl className="grid gap-2 text-sm">
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd>{lead.email || "—"}</dd>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd>{lead.phone || "—"}</dd>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <dt className="text-muted-foreground">Owner</dt>
                  <dd>{lead.created_by || "Unassigned"}</dd>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <dt className="text-muted-foreground">Last enriched</dt>
                  <dd>{formatDateTime(lead.last_enriched_at)}</dd>
                </div>
              </dl>
            </div>
            {(lead as any).gohighlevel_contact_id && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground uppercase">Leadslift CRM Sync</h3>
                <Separator className="my-2" />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Synced
                    </Badge>
                  </div>
                  {(lead as any).gohighlevel_last_synced_at && (
                    <p className="text-sm text-muted-foreground">
                      Last synced: {formatDateTime((lead as any).gohighlevel_last_synced_at)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground uppercase">Enrichment metadata</h3>
            <Separator className="my-2" />
            {metadataEntries.length > 0 ? (
              <ScrollArea className="max-h-72 pr-2 text-sm">
                <dl className="space-y-2">
                  {metadataEntries.map(([key, value]) => (
                    <div key={key} className="grid gap-1">
                      <dt className="font-medium text-foreground">{key}</dt>
                      <dd className="text-muted-foreground break-words">
                        {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground">
                No enrichment metadata available yet. Trigger an enrichment run to populate additional context.
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          Lead ID: {lead.id}
        </CardFooter>
      </Card>
    </div>
  );
}


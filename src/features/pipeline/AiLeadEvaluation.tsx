import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Sparkles, RefreshCw, Loader2, Mail, ExternalLink } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import axiosPrivate from "@/lib/axiosPrivate";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ContactOption {
  id: string;
  name: string;
  email: string | null;
  position: string | null;
  phone: string | null;
}

interface ResearchMetrics {
  employees?: number | null;
  revenue?: number | null;
  location?: string | null;
  industry?: string | null;
}

interface ResearchData {
  company_overview?: string;
  recent_news?: string | string[];
  metrics?: ResearchMetrics;
  linkedin?: string | null;
  fit_score?: string;
  reasoning?: string;
}

interface AgentRunRow {
  id: string;
  created_at: string;
  output: {
    research?: ResearchData;
    fit_summary?: string;
    [key: string]: unknown;
  } | null;
  generated_tasks: unknown;
}

interface EmailTask {
  type?: string;
  subject?: string | null;
  body?: string | null;
  [key: string]: unknown;
}

interface LeadResearchResponse {
  success: boolean;
  research: ResearchData;
  fit: {
    score: string;
    probability: number;
    reasoning: string;
  };
}

interface AiLeadEvaluationProps {
  dealId: string;
  clientId: string;
  companyName: string;
  website?: string | null;
  probability?: number | null;
  status?: string | null;
  canAccess: boolean;
  onDealRefetch: () => Promise<unknown>;
}

const formatCurrency = (value?: number | null) => {
  if (!value) return "-";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
};

const formatNumber = (value?: number | null) => {
  if (!value) return "-";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
};

const AiLeadEvaluation = ({
  dealId,
  clientId,
  companyName,
  website,
  probability,
  status,
  canAccess,
  onDealRefetch,
}: AiLeadEvaluationProps) => {
  const [selectedContactId, setSelectedContactId] = useState<string | undefined>();
  const [emailDraft, setEmailDraft] = useState<string>("");

  const contactsQuery = useQuery({
    queryKey: ["client-contacts", clientId],
    enabled: canAccess && Boolean(clientId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, email, phone, position")
        .eq("client_id", clientId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      return (data ?? []).map((contact) => ({
        id: contact.id,
        name: [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.email || "Unnamed Contact",
        email: contact.email,
        phone: contact.phone,
        position: contact.position,
      })) as ContactOption[];
    },
  });

  const runQuery = useQuery({
    queryKey: ["lead-evaluation-run", dealId],
    enabled: canAccess && Boolean(dealId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_agent_runs")
        .select("id, created_at, output, generated_tasks, execution_context")
        .eq("category", "lead_evaluation")
        .eq("execution_context->>deal_id", dealId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (!data) return null;
      const { execution_context, ...rest } = data as AgentRunRow & { execution_context?: Record<string, unknown> };
      if (execution_context?.deal_id && execution_context.deal_id !== dealId) {
        return null;
      }
      return rest as AgentRunRow;
    },
  });

  useEffect(() => {
    if (contactsQuery.isLoading) return;
    const firstContactId = contactsQuery.data?.[0]?.id;
    if (firstContactId) {
      setSelectedContactId((current) => current ?? firstContactId);
    }
  }, [contactsQuery.data, contactsQuery.isLoading]);

  const selectedContact = useMemo(
    () => contactsQuery.data?.find((contact) => contact.id === selectedContactId) ?? null,
    [contactsQuery.data, selectedContactId],
  );

  const latestResearch = useMemo<ResearchData | null>(() => {
    const research = runQuery.data?.output?.research;
    if (research && typeof research === "object") {
      return research as ResearchData;
    }
    return null;
  }, [runQuery.data]);

  const fitSummary = useMemo(() => {
    if (runQuery.data?.output?.fit_summary && typeof runQuery.data.output.fit_summary === "string") {
      return runQuery.data.output.fit_summary;
    }
    return latestResearch?.reasoning ?? null;
  }, [latestResearch, runQuery.data]);

  const emailTask = useMemo(() => {
    const payload = runQuery.data?.generated_tasks;
    if (!payload) return null;
    const tasksArray: EmailTask[] = Array.isArray(payload)
      ? payload.filter((task): task is EmailTask => typeof task === "object" && task !== null)
      : typeof payload === "object" && payload !== null
      ? [payload as EmailTask]
      : [];

    return (
      tasksArray.find((task) => {
        const type = typeof task.type === "string" ? task.type.toLowerCase() : "";
        return type.includes("email");
      }) ?? null
    );
  }, [runQuery.data?.generated_tasks]);

  useEffect(() => {
    setEmailDraft(emailTask?.body ?? "");
  }, [emailTask?.body]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: {
        client_id: string;
        contact_id?: string;
        company: string;
        website?: string;
        deal_id: string;
      } = {
        client_id: clientId,
        company: companyName,
        website: website ?? undefined,
        deal_id: dealId,
      };

      if (selectedContactId) {
        payload.contact_id = selectedContactId;
      }

      const { data } = await axiosPrivate.post<LeadResearchResponse>("/lead-research-evaluate", payload);
      return data;
    },
    onSuccess: async () => {
      toast({ title: "AI research complete", description: "Lead evaluation updated." });
      await Promise.all([runQuery.refetch(), onDealRefetch()]);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unable to run AI research";
      toast({ title: "Research failed", description: message, variant: "destructive" });
    },
  });

  const recentNewsItems = useMemo(() => {
    if (!latestResearch?.recent_news) return [] as string[];
    if (Array.isArray(latestResearch.recent_news)) {
      return latestResearch.recent_news.filter((item) => typeof item === "string");
    }
    return String(latestResearch.recent_news)
      .split(/\n|\r/) // split lines
      .map((item) => item.trim())
      .filter(Boolean);
  }, [latestResearch?.recent_news]);

  if (!canAccess) {
    return null;
  }

  const lastUpdated = runQuery.data?.created_at
    ? formatDistanceToNow(new Date(runQuery.data.created_at), { addSuffix: true })
    : null;

  const currentFitScore = latestResearch?.fit_score ?? "Not evaluated";

  return (
    <Card className="border-primary/20 bg-muted/30">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Lead Evaluation
          </CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={selectedContactId} onValueChange={(value) => setSelectedContactId(value)}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select contact" />
              </SelectTrigger>
              <SelectContent>
                {contactsQuery.isLoading ? (
                  <SelectItem value="loading" disabled>
                    Loading contacts…
                  </SelectItem>
                ) : contactsQuery.data && contactsQuery.data.length > 0 ? (
                  contactsQuery.data.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="empty" disabled>
                    No contacts available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {selectedContactId ? "Evaluate Contact" : "Research Company"}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>Company: {companyName}</span>
          {website && (
            <span className="flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              <a href={website.startsWith("http") ? website : `https://${website}`} target="_blank" rel="noreferrer">
                {website}
              </a>
            </span>
          )}
          {selectedContact && (
            <span>
              Contact: {selectedContact.name}
              {selectedContact.position ? ` (${selectedContact.position})` : ""}
            </span>
          )}
          {lastUpdated && <span>Last updated {lastUpdated}</span>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="research" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="research">Research</TabsTrigger>
            <TabsTrigger value="fit">Fit Score</TabsTrigger>
            <TabsTrigger value="email">Email Draft</TabsTrigger>
          </TabsList>

          <TabsContent value="research" className="mt-4 space-y-4">
            {runQuery.isLoading ? (
              <div className="flex h-32 items-center justify-center rounded-md border border-dashed">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : latestResearch ? (
              <div className="space-y-4">
                <div className="rounded-lg border bg-background p-4 shadow-sm">
                  <h4 className="text-sm font-semibold">Company Overview</h4>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {latestResearch.company_overview ?? "No overview available."}
                  </p>
                </div>
                <div className="rounded-lg border bg-background p-4 shadow-sm">
                  <h4 className="text-sm font-semibold">Key Metrics</h4>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <MetricItem label="Employees" value={formatNumber(latestResearch.metrics?.employees)} />
                    <MetricItem label="Revenue" value={formatCurrency(latestResearch.metrics?.revenue)} />
                    <MetricItem label="Location" value={latestResearch.metrics?.location ?? "-"} />
                    <MetricItem label="Industry" value={latestResearch.metrics?.industry ?? "-"} />
                  </div>
                  {latestResearch.linkedin && (
                    <a
                      href={latestResearch.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="mr-1 h-4 w-4" /> LinkedIn Profile
                    </a>
                  )}
                </div>
                <div className="rounded-lg border bg-background p-4 shadow-sm">
                  <h4 className="text-sm font-semibold">Recent News</h4>
                  {recentNewsItems.length > 0 ? (
                    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                      {recentNewsItems.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">No recent updates captured.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                Run AI research to populate this section.
              </div>
            )}
          </TabsContent>

          <TabsContent value="fit" className="mt-4 space-y-4">
            <div className="rounded-lg border bg-background p-4 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-sm">
                  {currentFitScore}
                </Badge>
                {typeof probability === "number" && (
                  <span className="text-sm text-muted-foreground">Pipeline probability: {probability}%</span>
                )}
                {status && <span className="text-sm text-muted-foreground">Deal status: {status}</span>}
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold">
                  {selectedContactId ? "Contact Fit Analysis" : "Company Insights"}
                </h4>
                <p className="mt-2 text-sm text-muted-foreground">
                  {fitSummary ?? (selectedContactId 
                    ? "Run the evaluation to see contact fit reasoning." 
                    : "Run company research to gather insights.")}
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="email" className="mt-4 space-y-4">
            {emailTask && selectedContactId ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  Personalized SDR email ready for review.
                </div>
                <Textarea
                  value={emailDraft}
                  onChange={(event) => setEmailDraft(event.target.value)}
                  rows={10}
                  className="resize-none"
                />
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                {selectedContactId 
                  ? "Run AI research to generate an email draft for this contact." 
                  : "Select a contact to generate a personalized email draft."}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

const MetricItem = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border border-dashed bg-muted/40 p-3">
    <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
    <p className="mt-1 text-sm font-medium">{value}</p>
  </div>
);

export default AiLeadEvaluation;
